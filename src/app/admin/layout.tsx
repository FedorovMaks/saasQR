import { requireAuth } from "@/lib/auth-guard";
import { Sidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

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
