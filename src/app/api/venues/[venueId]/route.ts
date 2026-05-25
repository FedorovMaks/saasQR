import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { venueSchema } from "@/lib/validators";

async function getVenueForOwner(venueId: string, userId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  });

  if (!venue || !venue.isActive) {
    return null;
  }

  if (venue.ownerId !== userId) {
    return "forbidden" as const;
  }

  return venue;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { venueId } = await params;
  const venue = await getVenueForOwner(venueId, session.user.id);

  if (!venue) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }
  if (venue === "forbidden") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  return NextResponse.json(venue);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { venueId } = await params;
  const venue = await getVenueForOwner(venueId, session.user.id);

  if (!venue) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }
  if (venue === "forbidden") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = venueSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== venue.slug) {
      const existing = await prisma.venue.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Такой slug уже занят" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.venue.update({
      where: { id: venueId },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { venueId } = await params;
  const venue = await getVenueForOwner(venueId, session.user.id);

  if (!venue) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }
  if (venue === "forbidden") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  await prisma.venue.update({
    where: { id: venueId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
