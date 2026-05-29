import { requireAuth } from "@/lib/auth-guard";
import { Sidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  // Superadmin goes straight to /superadmin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });
  if (user?.isSuperAdmin) redirect("/superadmin");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
