import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

// GET — current user profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PATCH — update name
const updateNameSchema = z.object({
  action: z.literal("update_name"),
  name: z.string().min(2, "Имя должно содержать минимум 2 символа").max(100),
});

// PATCH — change password
const changePasswordSchema = z.object({
  action: z.literal("change_password"),
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(8, "Новый пароль должен содержать минимум 8 символов"),
});

// PATCH — change email
const changeEmailSchema = z.object({
  action: z.literal("change_email"),
  newEmail: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль для подтверждения"),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;

    // Update name
    if (action === "update_name") {
      const result = updateNameSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: result.data.name },
      });

      return NextResponse.json({ success: true, message: "Имя обновлено" });
    }

    // Change password
    if (action === "change_password") {
      const result = changePasswordSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hashedPassword: true },
      });

      if (!user) {
        return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
      }

      const isValid = await compare(result.data.currentPassword, user.hashedPassword);
      if (!isValid) {
        return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });
      }

      const hashedPassword = await hash(result.data.newPassword, 12);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { hashedPassword },
      });

      return NextResponse.json({ success: true, message: "Пароль изменён" });
    }

    // Change email
    if (action === "change_email") {
      const result = changeEmailSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hashedPassword: true, email: true },
      });

      if (!user) {
        return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
      }

      const isValid = await compare(result.data.password, user.hashedPassword);
      if (!isValid) {
        return NextResponse.json({ error: "Неверный пароль" }, { status: 400 });
      }

      if (user.email === result.data.newEmail) {
        return NextResponse.json({ error: "Новый email совпадает с текущим" }, { status: 400 });
      }

      // Check if email is taken
      const existing = await prisma.user.findUnique({
        where: { email: result.data.newEmail },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Этот email уже занят" },
          { status: 409 }
        );
      }

      // Send verification email for new address
      try {
        const crypto = await import("crypto");
        const token = crypto.randomUUID();

        await prisma.verificationToken.create({
          data: {
            identifier: result.data.newEmail,
            token,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        const { sendVerificationEmail } = await import("@/lib/email");
        await sendVerificationEmail(result.data.newEmail, token);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      // Update email immediately and mark as unverified
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          email: result.data.newEmail,
          emailVerified: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Email изменён. Проверьте новую почту для подтверждения.",
        requiresRelogin: true,
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

// DELETE — delete account
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Введите пароль" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hashedPassword: true, isSuperAdmin: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Аккаунт суперадмина нельзя удалить" },
        { status: 403 }
      );
    }

    const isValid = await compare(password, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: "Неверный пароль" }, { status: 400 });
    }

    // Delete user and all related data (cascading delete in schema)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
