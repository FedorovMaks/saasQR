import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reorderSchema } from "@/lib/validators";
import {
  getApiUser,
  unauthorized,
  forbidden,
  notFoundResponse,
  verifyVenueOwner,
} from "@/lib/auth-guard";

export async function PATCH(
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
  const result = reorderSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  // Scope updates to items belonging to this venue's categories
  const updates = result.data.ids.map((id, index) =>
    prisma.menuItem.updateMany({
      where: { id, category: { venueId } },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(updates);

  return NextResponse.json({ success: true });
}
