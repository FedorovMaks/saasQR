export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { VenueForm } from "@/components/admin/venue-form";
import { VenueQR } from "@/components/admin/venue-qr";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { venueId } = await params;

  const [venue, user] = await Promise.all([
    prisma.venue.findUnique({ where: { id: venueId } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    }),
  ]);

  if (!venue || !venue.isActive) notFound();
  if (venue.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <VenueQR
        venueId={venue.id}
        slug={venue.slug}
        venueName={venue.name}
        logoUrl={venue.logoUrl}
        accentColor={venue.accentColor}
      />
      <VenueForm venue={venue} userPlan={user?.plan || "BASIC"} />
    </div>
  );
}
