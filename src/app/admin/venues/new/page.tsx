import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasActiveSubscription, checkVenueLimit } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { VenueForm } from "@/components/admin/venue-form";

export default async function NewVenuePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const subscription = await hasActiveSubscription(session.user.id);
  if (!subscription.active) redirect("/admin");

  const [user, limitCheck, ownedVenues] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    }),
    checkVenueLimit(session.user.id),
    prisma.venue.findMany({
      where: { ownerId: session.user.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: { categories: { where: { isActive: true } } },
        },
      },
    }),
  ]);

  if (!limitCheck.allowed) redirect("/admin");

  const isExtra = "isExtra" in limitCheck && limitCheck.isExtra;
  const extraPrice = isExtra ? limitCheck.extraPrice : undefined;

  // Заведения, из которых можно перенести меню (есть хотя бы одна категория)
  const copyableVenues = ownedVenues
    .filter((v) => v._count.categories > 0)
    .map((v) => ({ id: v.id, name: v.name }));

  return (
    <div className="max-w-2xl">
      <VenueForm
        userPlan={user?.plan || "BASIC"}
        isExtraVenue={isExtra || false}
        extraVenuePrice={extraPrice}
        copyableVenues={copyableVenues}
      />
    </div>
  );
}
