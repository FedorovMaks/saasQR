import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseWebhookEvent,
  getPayment,
  getPlatformCredentials,
  type YooKassaPayment,
} from "@/lib/yookassa";
import { emitOrderEvent } from "@/lib/order-events";
import { sendPushToVenueTeam } from "@/lib/push-notify";
import {
  activateTrial,
  activatePlan,
  getPeriodFromAmountKopecks,
  type BillingPeriod,
} from "@/lib/plans";

/**
 * YooKassa webhook handler.
 * Receives payment status notifications.
 *
 * YooKassa sends:
 * - payment.succeeded — payment completed
 * - payment.canceled — payment canceled
 * - payment.waiting_for_capture — needs capture (we use auto-capture)
 *
 * Webhook URL to configure in YooKassa dashboard:
 * https://your-domain.com/api/payments/webhook
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const event = parseWebhookEvent(body);

    if (!event) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const payment = event.object;

    // ─── Subscription payments (platform) ───
    if (payment.metadata?.kind === "subscription") {
      await handleSubscriptionPayment(event.event, payment);
      return NextResponse.json({ ok: true });
    }

    // ─── Order payments (per-venue) ───
    const orderId = payment.metadata?.order_id;

    if (!orderId) {
      // No order linked — ignore
      return NextResponse.json({ ok: true });
    }

    // Find the order + venue credentials (needed to verify with YooKassa)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        venueId: true,
        paymentStatus: true,
        paymentId: true,
        totalAmount: true,
        venue: {
          select: { yookassaShopId: true, yookassaSecretKey: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ ok: true }); // Order not found, ignore
    }

    // Verify payment ID matches
    if (order.paymentId && order.paymentId !== payment.id) {
      return NextResponse.json({ ok: true }); // Different payment, ignore
    }

    if (event.event === "payment.succeeded") {
      // SECURITY: never trust the webhook body. Re-fetch the payment from
      // YooKassa with the venue's own credentials and verify status + amount
      // before marking the order paid. Otherwise anyone who knows an orderId
      // could forge a "succeeded" webhook and get a free meal.
      const shopId = order.venue?.yookassaShopId;
      const secretKey = order.venue?.yookassaSecretKey;
      if (!shopId || !secretKey) {
        return NextResponse.json({ ok: true });
      }

      let verified: YooKassaPayment;
      try {
        verified = await getPayment({ shopId, secretKey, paymentId: payment.id });
      } catch {
        return NextResponse.json({ ok: true });
      }

      const amountOk =
        verified.amount?.value === (order.totalAmount / 100).toFixed(2);
      const boundToOrder = verified.metadata?.order_id === orderId;

      if (
        verified.status !== "succeeded" ||
        !verified.paid ||
        !amountOk ||
        !boundToOrder
      ) {
        return NextResponse.json({ ok: true });
      }

      // Payment verified
      if (order.paymentStatus !== "PAID") {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "PAID" },
        });

        // Emit SSE event for admin dashboard
        emitOrderEvent({
          type: "status_change",
          venueId: order.venueId,
          order: {
            id: order.id,
            paymentStatus: "PAID",
          },
        });

        // Notify venue team — await so the serverless function isn't
        // frozen before the push reaches APNs/FCM
        try {
          await sendPushToVenueTeam(order.venueId, {
            title: `Оплата получена #${order.orderNumber}`,
            body: `Заказ #${order.orderNumber} оплачен`,
            tag: `payment-${order.id}`,
            url: `/admin/venues/${order.venueId}/orders`,
          });
        } catch {
          // ignore push errors
        }
      }
    }

    if (event.event === "payment.canceled") {
      // Only a still-PENDING order may be moved to UNPAID. Never flip a
      // verified PAID order back to UNPAID from a (potentially forged) cancel.
      if (order.paymentStatus === "PENDING") {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "UNPAID" },
        });

        emitOrderEvent({
          type: "status_change",
          venueId: order.venueId,
          order: {
            id: order.id,
            paymentStatus: "UNPAID",
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to YooKassa
  }
}

/**
 * Handle a platform subscription payment notification.
 * Verifies the payment with the platform credentials (don't trust the body
 * blindly), then activates the trial/plan idempotently.
 */
async function handleSubscriptionPayment(
  eventType: string,
  payment: YooKassaPayment
) {
  // Locate our pending record (by YooKassa id, fallback to recordId metadata)
  const recordId = payment.metadata?.recordId;
  const record =
    (await prisma.subscriptionPayment.findUnique({
      where: { yookassaId: payment.id },
    })) ||
    (recordId
      ? await prisma.subscriptionPayment.findUnique({ where: { id: recordId } })
      : null);

  if (!record) return; // unknown payment — ignore

  // Idempotency — already processed
  if (record.status === "succeeded") return;

  if (eventType === "payment.canceled") {
    await prisma.subscriptionPayment.update({
      where: { id: record.id },
      data: { status: "cancelled" },
    });
    return;
  }

  if (eventType !== "payment.succeeded") return;

  // Verify the payment really succeeded by re-fetching from YooKassa.
  // We trust ONLY: our own DB record (server-created) + the verified payment
  // amount/metadata returned by YooKassa — never the raw webhook body.
  const creds = await getPlatformCredentials();
  if (!creds) return;

  let verified: YooKassaPayment;
  try {
    verified = await getPayment({
      shopId: creds.shopId,
      secretKey: creds.secretKey,
      paymentId: payment.id,
    });
  } catch {
    return; // can't verify — don't activate
  }

  if (verified.status !== "succeeded" || !verified.paid) return;

  // Bind the verified payment to THIS record (metadata from YooKassa, not body)
  if (verified.metadata?.recordId !== record.id) return;

  // The amount actually paid must equal what we charged for this record
  const expectedValue = (record.amount / 100).toFixed(2);
  if (verified.amount?.value !== expectedValue) return;

  const userId = record.userId;
  const periodStart = new Date();
  let periodEnd: Date;

  if (record.type === "TRIAL") {
    periodEnd = await activateTrial(userId);
  } else {
    // Period is derived from the paid amount, not trusted from the body
    const period: BillingPeriod =
      getPeriodFromAmountKopecks(record.plan, record.amount) ?? "monthly";
    periodEnd = await activatePlan(userId, record.plan, period);
  }

  await prisma.subscriptionPayment.update({
    where: { id: record.id },
    data: {
      status: "succeeded",
      yookassaId: payment.id,
      periodStart,
      periodEnd,
    },
  });
}
