import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { venueSchema } from "@/lib/validators";
import { checkVenueLimit, hasActiveSubscription } from "@/lib/plans";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const venues = await prisma.venue.findMany({
    where: { ownerId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(venues);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = venueSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, slug, description, address, logoUrl } = result.data;

    // Check active subscription
    const subscription = await hasActiveSubscription(session.user.id);
    if (!subscription.active) {
      return NextResponse.json(
        { error: "Для создания заведения нужна активная подписка" },
        { status: 403 }
      );
    }

    // Check venue limit for user's plan
    const limitCheck = await checkVenueLimit(session.user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason },
        { status: 403 }
      );
    }

    const existingVenue = await prisma.venue.findUnique({
      where: { slug },
    });

    if (existingVenue) {
      return NextResponse.json(
        { error: "Такой slug уже занят. Выберите другой." },
        { status: 409 }
      );
    }

    const venue = await prisma.venue.create({
      data: {
        name,
        slug,
        description: description || null,
        address: address || null,
        logoUrl: logoUrl || null,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(venue, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
