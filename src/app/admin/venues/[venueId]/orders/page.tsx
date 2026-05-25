import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { venueId } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      isActive: true,
    },
  });

  if (!venue || !venue.isActive) notFound();

  // Allow access for owner OR active staff
  if (venue.ownerId !== session.user.id) {
    const staffRecord = await prisma.staff.findUnique({
      where: { venueId_userId: { venueId, userId: session.user.id } },
    });
    if (!staffRecord?.isActive) notFound();
  }

  // Fetch today's orders for initial render
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialOrders = await prisma.order.findMany({
    where: {
      venueId,
      createdAt: { gte: today },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for client component
  const serializedOrders = initialOrders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }));

  return (
    <OrdersDashboard
      venue={{ id: venue.id, name: venue.name, slug: venue.slug }}
      initialOrders={serializedOrders}
    />
  );
}
