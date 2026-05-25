import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { menuItemSchema } from "@/lib/validators";
import {
  getApiUser,
  unauthorized,
  forbidden,
  notFoundResponse,
  verifyVenueOwner,
} from "@/lib/auth-guard";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  const items = await prisma.menuItem.findMany({
    where: { category: { venueId }, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(items);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  const body = await req.json();
  const result = menuItemSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, description, price, categoryId, imageUrl, variants, calories, proteins, fats, carbs, composition } =
    result.data;

  // Verify category belongs to this venue
  const category = await prisma.category.findFirst({
    where: { id: categoryId, venueId },
  });
  if (!category) {
    return NextResponse.json(
      { error: "Категория не найдена" },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.menuItem.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });

  const item = await prisma.menuItem.create({
    data: {
      name,
      description: description || null,
      price,
      categoryId,
      imageUrl: imageUrl || null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      calories: calories ?? null,
      proteins: proteins ?? null,
      fats: fats ?? null,
      carbs: carbs ?? null,
      composition: composition || null,
      variants: variants?.length
        ? {
            create: variants.map((v, i) => ({
              label: v.label,
              price: v.price,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: { variants: true },
  });

  return NextResponse.json(item, { status: 201 });
}
