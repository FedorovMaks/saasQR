export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { MenuManager } from "@/components/admin/menu-manager";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { venueId } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: { variants: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  if (!venue || !venue.isActive) notFound();
  if (venue.ownerId !== session.user.id) notFound();

  return <MenuManager venue={venue} />;
}
