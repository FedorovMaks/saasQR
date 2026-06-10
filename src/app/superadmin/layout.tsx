import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) redirect("/admin");

  return (
    <div className="min-h-screen bg-[#101014] text-[#c8c8c4]" data-theme="dark">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-[#18181c]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/superadmin" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-sm bg-[#a82828] flex items-center justify-center text-[10px] font-bold uppercase text-white">
                  SA
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#f0f0ee]">Super Admin</span>
              </Link>
              <span className="text-[10px] text-[#55555a] font-mono">
                {session.user.email}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#55555a] hover:text-[#c8c8c4] transition-colors"
              >
                Панель
              </Link>
              <Link
                href="/"
                className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#55555a] hover:text-[#c8c8c4] transition-colors"
              >
                Сайт
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
