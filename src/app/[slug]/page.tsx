import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MenuPage } from "@/components/menu/menu-page";
import { getEffectivePlan, hasFeature, hasActiveSubscription } from "@/lib/plans";

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

  // Block the guest menu if the owner has no active subscription (past grace)
  const ownerSub = await hasActiveSubscription(venue.ownerId);
  if (!ownerSub.active) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center px-6">
        <div className="max-w-sm w-full rounded-3xl bg-white p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50">
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-black mb-2">Меню временно недоступно</h1>
          <p className="text-gray-400 font-semibold text-sm">
            Заведение «{venue.name}» временно не принимает заказы. Загляните
            позже.
          </p>
        </div>
      </div>
    );
  }

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
