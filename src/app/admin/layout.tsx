export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth-guard";
import { Sidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExpiryBanner } from "@/components/admin/expiry-banner";
import { GRACE_DAYS } from "@/lib/plans";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true, plan: true, planExpiresAt: true },
  });
  if (user?.isSuperAdmin) redirect("/superadmin");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <ExpiryBanner
          plan={user?.plan ?? "BASIC"}
          planExpiresAt={user?.planExpiresAt?.toISOString() ?? null}
          graceDays={GRACE_DAYS}
        />
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
