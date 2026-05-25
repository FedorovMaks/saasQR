import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { checkFeatureAccess } from "@/lib/plans";
import Link from "next/link";
import { ArrowLeft, Crown, BarChart3 } from "lucide-react";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { venueId } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, name: true, slug: true, ownerId: true },
  });

  if (!venue || venue.ownerId !== session.user.id) notFound();

  // Check plan access
  const access = await checkFeatureAccess(session.user.id, "analytics");

  if (!access.allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-3xl bg-white p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] max-w-md">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-50 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-black mb-2">Аналитика недоступна</h3>
          <p className="text-sm text-gray-400 font-semibold mb-6">
            {access.reason}
          </p>
          <div className="flex items-center gap-3 justify-center">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-600 hover:bg-[#e4e8f2] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Link>
            <Link
              href="/admin/billing"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563eb] px-5 text-sm font-extrabold text-white shadow-md shadow-blue-500/15 hover:shadow-lg transition-all"
            >
              <Crown className="h-4 w-4" />
              Улучшить тариф
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AnalyticsDashboard venue={venue} />;
}
