import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getApiUser,
  unauthorized,
  forbidden,
  notFoundResponse,
  verifyVenueOwner,
} from "@/lib/auth-guard";

// GET — list staff members for a venue
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

  const staff = await prisma.staff.findMany({
    where: { venueId, isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff);
}

// DELETE — remove a staff member
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId } = await params;
  const venue = await verifyVenueOwner(venueId, user.id);
  if (!venue) return notFoundResponse();
  if (venue === "forbidden") return forbidden();

  const { staffId } = await req.json();

  // Verify staff belongs to this venue
  const staffRecord = await prisma.staff.findFirst({
    where: { id: staffId, venueId },
  });

  if (!staffRecord) {
    return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  }

  await prisma.staff.update({
    where: { id: staffId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
