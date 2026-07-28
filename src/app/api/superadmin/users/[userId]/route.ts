import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { TRIAL_CONFIG } from "@/lib/plans";
import { z } from "zod";

// GET — detailed user info for troubleshooting
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      planExpiresAt: true,
      trialEndsAt: true,
      isSuperAdmin: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      venues: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              categories: true,
              tables: true,
              staff: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      staffRoles: {
        select: {
          id: true,
          role: true,
          isActive: true,
          venue: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PATCH — update user plan
const updateSchema = z.object({
  plan: z.enum(["BASIC", "BUSINESS", "PRO"]).optional(),
  isSuperAdmin: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  activateTrial: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (result.data.plan) {
    data.plan = result.data.plan;
    if (result.data.plan !== "BASIC") {
      data.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      data.planExpiresAt = null;
    }
  }
  if (result.data.isSuperAdmin !== undefined) {
    data.isSuperAdmin = result.data.isSuperAdmin;
  }
  if (result.data.emailVerified !== undefined) {
    data.emailVerified = result.data.emailVerified;
  }
  if (result.data.activateTrial) {
    const trialMs = TRIAL_CONFIG.durationDays * 24 * 60 * 60 * 1000;
    data.plan = TRIAL_CONFIG.plan;
    data.trialEndsAt = new Date(Date.now() + trialMs);
    data.planExpiresAt = new Date(Date.now() + trialMs);
    // Триал израсходован — иначе его можно будет ещё раз купить за 1₽
    data.trialUsed = true;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, plan: true, isSuperAdmin: true },
  });

  return NextResponse.json(updated);
}

// DELETE — delete user and all related data
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isSuperAdmin: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  if (user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Нельзя удалить суперадмина" },
      { status: 403 }
    );
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ success: true });
}
