import { prisma } from "@/lib/prisma";
import { SuperAdminDashboard } from "@/components/superadmin/dashboard";

export default async function SuperAdminPage() {
  // Get stats
  const [totalUsers, totalVenues, totalOrders, planCounts] = await Promise.all([
    prisma.user.count(),
    prisma.venue.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.user.groupBy({
      by: ["plan"],
      _count: true,
    }),
  ]);

  const stats = {
    totalUsers,
    totalVenues,
    totalOrders,
    plans: Object.fromEntries(planCounts.map((p) => [p.plan, p._count])),
  };

  return <SuperAdminDashboard stats={stats} />;
}
