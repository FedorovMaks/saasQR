import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser, unauthorized, forbidden } from "@/lib/auth-guard";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { venueId } = await params;

  // Verify ownership
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { ownerId: true },
  });

  if (!venue) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }

  if (venue.ownerId !== user.id) return forbidden();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const table = searchParams.get("table");

  // Build where clause
  const where: Record<string, unknown> = { venueId };

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (table) {
    where.tableNumber = table;
  }

  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    where.createdAt = { gte: dayStart, lte: dayEnd };
  } else {
    // Default: today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.createdAt = { gte: today };
  }

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
