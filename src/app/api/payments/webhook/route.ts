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
import { activateTrial, activatePlan, type BillingPeriod } from "@/lib/plans";
import { Plan } from "@/generated/prisma";

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

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        venueId: true,
        paymentStatus: true,
        paymentId: true,
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
      // Payment successful
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
      // Payment canceled
      if (order.paymentStatus !== "UNPAID") {
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

  // Verify the payment really succeeded by re-fetching from YooKassa
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

  const type = payment.metadata?.type;
  const userId = record.userId;

  // Activate access
  let periodStart = new Date();
  let periodEnd: Date;

  if (type === "TRIAL") {
    periodEnd = await activateTrial(userId);
  } else {
    const plan = (payment.metadata?.plan as Plan) || record.plan;
    const period = (payment.metadata?.period as BillingPeriod) || "monthly";
    periodEnd = await activatePlan(userId, plan, period);
  }
  periodStart = new Date();

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
