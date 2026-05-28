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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/superadmin" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center text-xs font-black">
                  SA
                </div>
                <span className="text-sm font-extrabold text-white">Super Admin</span>
              </Link>
              <span className="text-xs text-gray-500 font-medium">
                {session.user.email}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >
                Обычная панель
              </Link>
              <Link
                href="/"
                className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
              >
                Сайт
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
