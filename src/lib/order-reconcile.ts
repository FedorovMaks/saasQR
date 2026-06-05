import { prisma } from "./prisma";
import { getPayment, type YooKassaPayment } from "./yookassa";
import { emitOrderEvent } from "./order-events";
import { sendPushToVenueTeam } from "./push-notify";

/**
 * Fallback reconciliation for a guest order payment.
 *
 * YooKassa webhooks are best-effort and may be delayed or not delivered at all
 * (notably for freshly-activated shops). The guest order-status page polls
 * GET /api/orders/[orderId] every few seconds, so we reconcile the order's
 * payment against YooKassa there — the order flips to PAID even when the
 * webhook never arrives.
 *
 * Same safety as the webhook handler: trust only the payment re-fetched from
 * YooKassa (with the venue's own credentials), bound to THIS order by
 * order_id + amount, with an atomic claim to avoid double-processing.
 */
export async function reconcileOrderPayment(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      venueId: true,
      paymentStatus: true,
      paymentId: true,
      totalAmount: true,
      venue: { select: { yookassaShopId: true, yookassaSecretKey: true } },
    },
  });

  if (!order || order.paymentStatus !== "PENDING" || !order.paymentId) return;

  const shopId = order.venue?.yookassaShopId;
  const secretKey = order.venue?.yookassaSecretKey;
  if (!shopId || !secretKey) return;

  let verified: YooKassaPayment;
  try {
    verified = await getPayment({
      shopId,
      secretKey,
      paymentId: order.paymentId,
    });
  } catch {
    return; // can't verify now — try again on the next poll
  }

  if (verified.status === "canceled") {
    const res = await prisma.order.updateMany({
      where: { id: orderId, paymentStatus: "PENDING" },
      data: { paymentStatus: "UNPAID" },
    });
    if (res.count > 0) {
      emitOrderEvent({
        type: "status_change",
        venueId: order.venueId,
        order: { id: order.id, paymentStatus: "UNPAID" },
      });
    }
    return;
  }

  if (verified.status !== "succeeded" || !verified.paid) return;

  // Bind the verified payment to THIS order and the charged amount.
  const amountOk =
    verified.amount?.value === (order.totalAmount / 100).toFixed(2);
  const boundToOrder = verified.metadata?.order_id === orderId;
  if (!amountOk || !boundToOrder) return;

  // Atomic claim: only the first caller (poll or webhook) flips it.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: "PENDING" },
    data: { paymentStatus: "PAID" },
  });
  if (claimed.count === 0) return; // already handled

  emitOrderEvent({
    type: "status_change",
    venueId: order.venueId,
    order: { id: order.id, paymentStatus: "PAID" },
  });

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
