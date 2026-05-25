import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MenuPage } from "@/components/menu/menu-page";
import { getEffectivePlan, hasFeature } from "@/lib/plans";

// Reserve these slugs so they don't conflict with app routes
const RESERVED_SLUGS = ["admin", "login", "register", "api", "settings", "join", "order"];

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { slug } = await params;
  const { table } = await searchParams;

  if (RESERVED_SLUGS.includes(slug)) notFound();

  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      accentColor: true,
      ownerId: true,
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          items: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              isStopped: true,
              calories: true,
              proteins: true,
              fats: true,
              carbs: true,
              composition: true,
              variants: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  label: true,
                  price: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!venue) notFound();

  // Check owner's plan for watermark
  const owner = await prisma.user.findUnique({
    where: { id: venue.ownerId },
    select: { plan: true, planExpiresAt: true },
  });

  const effectivePlan = owner ? getEffectivePlan(owner) : "BASIC";
  const showWatermark = !hasFeature(effectivePlan, "noWatermark");

  // Don't pass ownerId to client
  const { ownerId, ...venueData } = venue;

  return <MenuPage venue={venueData} tableNumber={table} showWatermark={showWatermark} />;
}
