import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { StaffManager } from "@/components/admin/staff-manager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { venueId } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, name: true, ownerId: true, isActive: true },
  });

  if (!venue || !venue.isActive) notFound();
  if (venue.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f2f8] text-gray-500 hover:bg-[#e4e8f2] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-black">Персонал — {venue.name}</h1>
      </div>
      <StaffManager venueId={venue.id} />
    </div>
  );
}
