import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getApiUser,
  unauthorized,
  forbidden,
  notFoundResponse,
  verifyVenueOwner,
} from "@/lib/auth-guard";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId, itemId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.isStopped !== undefined) updateData.isStopped = body.isStopped;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.calories !== undefined) updateData.calories = body.calories;
  if (body.proteins !== undefined) updateData.proteins = body.proteins;
  if (body.fats !== undefined) updateData.fats = body.fats;
  if (body.carbs !== undefined) updateData.carbs = body.carbs;
  if (body.composition !== undefined) updateData.composition = body.composition;

  const item = await prisma.menuItem.update({
    where: { id: itemId },
    data: updateData,
  });

  // Handle variants if provided
  if (body.variants !== undefined) {
    // Delete old variants
    await prisma.menuVariant.deleteMany({ where: { menuItemId: itemId } });
    // Create new ones
    if (body.variants.length > 0) {
      await prisma.menuVariant.createMany({
        data: body.variants.map(
          (v: { label: string; price: number }, i: number) => ({
            menuItemId: itemId,
            label: v.label,
            price: v.price,
            sortOrder: i,
          })
        ),
      });
    }
  }

  const updated = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId, itemId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  await prisma.menuItem.update({
    where: { id: itemId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
