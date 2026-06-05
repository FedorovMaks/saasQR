import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { emitOrderEvent } from "@/lib/order-events";
import { reconcileOrderPayment } from "@/lib/order-reconcile";
import { z } from "zod";

// Public GET — guest polls for order status (no auth required).
//
// Primary payment confirmation is the YooKassa webhook, but it can be delayed
// or not delivered (e.g. for freshly-activated shops). As a fallback we
// reconcile the order's payment against YooKassa on each poll, so it flips to
// PAID even if the webhook never arrives.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  try {
    await reconcileOrderPayment(orderId);
  } catch {
    // never break status polling because of a reconcile error
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentStatus: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  return NextResponse.json(order);
}

const updateOrderSchema = z.object({
  status: z.enum([
    "NEW",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { orderId } = await params;

  const body = await req.json();
  const result = updateOrderSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  // Get order and verify ownership
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { venue: { select: { ownerId: true } }, items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  // Check access: owner or staff member
  if (order.venue.ownerId !== user.id) {
    const staffRecord = await prisma.staff.findUnique({
      where: { venueId_userId: { venueId: order.venueId, userId: user.id } },
    });
    if (!staffRecord?.isActive) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: result.data.status },
    include: { items: true },
  });

  emitOrderEvent({
    type: "status_change",
    venueId: order.venueId,
    order: {
      id: updated.id,
      orderNumber: updated.orderNumber,
      tableNumber: updated.tableNumber,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      totalAmount: updated.totalAmount,
      comment: updated.comment,
      createdAt: updated.createdAt,
      items: updated.items,
    },
  });

  return NextResponse.json(updated);
}
