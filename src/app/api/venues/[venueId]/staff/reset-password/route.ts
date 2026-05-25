import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  staffId: z.string(),
});

function generatePassword(length = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { venueId } = await params;

  // Verify venue ownership
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { ownerId: true },
  });

  if (!venue || venue.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }

    // Find the staff member
    const staff = await prisma.staff.findFirst({
      where: { id: result.data.staffId, venueId },
      select: { userId: true },
    });

    if (!staff) {
      return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
    }

    // Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await hash(newPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: staff.userId },
      data: { hashedPassword },
    });

    // Return plain password — shown to admin once
    return NextResponse.json({ password: newPassword });
  } catch {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
