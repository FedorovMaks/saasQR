import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";
import {
  getApiUser,
  unauthorized,
  forbidden,
  notFoundResponse,
  verifyVenueOwner,
} from "@/lib/auth-guard";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId, categoryId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  const body = await req.json();
  const result = categorySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: { name: result.data.name },
  });

  return NextResponse.json(category);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId, categoryId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  await prisma.category.update({
    where: { id: categoryId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
