import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getApiUser,
  unauthorized,
  forbidden,
  notFoundResponse,
  verifyVenueOwner,
} from "@/lib/auth-guard";
import { checkFeatureAccess } from "@/lib/plans";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  // Check plan access
  const access = await checkFeatureAccess(user.id, "analytics");
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "week";

  // Calculate date range
  const now = new Date();
  let dateFrom: Date;

  switch (period) {
    case "today":
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom.setHours(0, 0, 0, 0);
      break;
    case "month":
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFrom.setHours(0, 0, 0, 0);
      break;
    case "all":
      dateFrom = new Date(0);
      break;
    default:
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom.setHours(0, 0, 0, 0);
  }

  // Fetch orders for the period (exclude cancelled)
  const orders = await prisma.order.findMany({
    where: {
      venueId,
      createdAt: { gte: dateFrom },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      totalAmount: true,
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Summary stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const orderCount = orders.length;
  const avgCheck = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  // Orders by status
  const statusCounts: Record<string, number> = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  // Revenue by day (for chart)
  const revenueByDay: Record<string, { revenue: number; orders: number }> = {};

  // Pre-fill days for the period so chart has no gaps
  if (period !== "all") {
    const days = period === "today" ? 1 : period === "week" ? 7 : 30;
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      revenueByDay[key] = { revenue: 0, orders: 0 };
    }
  }

  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (!revenueByDay[key]) {
      revenueByDay[key] = { revenue: 0, orders: 0 };
    }
    revenueByDay[key].revenue += o.totalAmount;
    revenueByDay[key].orders += 1;
  }

  const chart = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  // Top items
  const topItems = await prisma.orderItem.groupBy({
    by: ["itemName"],
    where: {
      order: {
        venueId,
        createdAt: { gte: dateFrom },
        status: { not: "CANCELLED" },
      },
    },
    _sum: { quantity: true, priceAtOrder: true },
    _count: true,
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  // Calculate total revenue per item (quantity * priceAtOrder)
  // groupBy _sum.priceAtOrder sums the unit price, not total — need raw query
  // Easier: fetch order items and aggregate manually
  const orderItemsRaw = await prisma.orderItem.findMany({
    where: {
      order: {
        venueId,
        createdAt: { gte: dateFrom },
        status: { not: "CANCELLED" },
      },
    },
    select: {
      itemName: true,
      quantity: true,
      priceAtOrder: true,
    },
  });

  const itemStats: Record<string, { quantity: number; revenue: number }> = {};
  for (const oi of orderItemsRaw) {
    if (!itemStats[oi.itemName]) {
      itemStats[oi.itemName] = { quantity: 0, revenue: 0 };
    }
    itemStats[oi.itemName].quantity += oi.quantity;
    itemStats[oi.itemName].revenue += oi.priceAtOrder * oi.quantity;
  }

  const topItemsList = Object.entries(itemStats)
    .sort(([, a], [, b]) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(([name, data], i) => ({
      rank: i + 1,
      name,
      quantity: data.quantity,
      revenue: data.revenue,
    }));

  return NextResponse.json({
    period,
    totalRevenue,
    orderCount,
    avgCheck,
    statusCounts,
    chart,
    topItems: topItemsList,
  });
}
