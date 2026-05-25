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

  const categories = await prisma.category.findMany({
    where: { venueId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: { where: { isActive: true } } } } },
  });

  return NextResponse.json(categories);
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
  const result = categorySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.category.aggregate({
    where: { venueId },
    _max: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      name: result.data.name,
      venueId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
