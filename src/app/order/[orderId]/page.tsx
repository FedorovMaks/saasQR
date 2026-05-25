import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { OrderStatusPage } from "@/components/order/order-status-page";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      venue: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!order) notFound();

  return (
    <OrderStatusPage
      order={{
        id: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        comment: order.comment,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
        })),
      }}
      venue={{
        id: order.venue.id,
        name: order.venue.name,
        slug: order.venue.slug,
      }}
    />
  );
}
