import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWebhookEvent } from "@/lib/yookassa";
import { emitOrderEvent } from "@/lib/order-events";
import { sendPushToVenueTeam } from "@/lib/push-notify";

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

        // Notify venue team
        sendPushToVenueTeam(order.venueId, {
          title: `Оплата получена #${order.orderNumber}`,
          body: `Заказ #${order.orderNumber} оплачен`,
          tag: `payment-${order.id}`,
          url: `/admin/venues/${order.venueId}/orders`,
        }).catch(() => {});
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
