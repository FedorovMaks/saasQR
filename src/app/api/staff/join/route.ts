import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const joinSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2, "Имя должно содержать минимум 2 символа").max(100),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = joinSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, name, email, password } = result.data;

    // Find valid invite
    const invite = await prisma.staffInvite.findUnique({
      where: { token },
      include: { venue: { select: { id: true, name: true } } },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Ссылка-приглашение не найдена" },
        { status: 404 }
      );
    }

    if (invite.isUsed) {
      return NextResponse.json(
        { error: "Эта ссылка уже использована" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Ссылка-приглашение истекла" },
        { status: 400 }
      );
    }

    // Check if email already exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // User exists — check if already staff at this venue
      const existingStaff = await prisma.staff.findUnique({
        where: { venueId_userId: { venueId: invite.venueId, userId: user.id } },
      });

      if (existingStaff?.isActive) {
        return NextResponse.json(
          { error: "Вы уже являетесь сотрудником этого заведения" },
          { status: 400 }
        );
      }

      // Reactivate or create staff record
      if (existingStaff) {
        await prisma.staff.update({
          where: { id: existingStaff.id },
          data: { isActive: true },
        });
      } else {
        await prisma.staff.create({
          data: { venueId: invite.venueId, userId: user.id, role: "waiter" },
        });
      }
    } else {
      // Create new user + staff record
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await prisma.user.create({
        data: { name, email, hashedPassword, emailVerified: true },
      });

      await prisma.staff.create({
        data: { venueId: invite.venueId, userId: user.id, role: "waiter" },
      });
    }

    // Mark invite as used
    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { isUsed: true },
    });

    return NextResponse.json({
      success: true,
      venueName: invite.venue.name,
    }, { status: 201 });
  } catch (error) {
    console.error("Staff join error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка" },
      { status: 500 }
    );
  }
}
