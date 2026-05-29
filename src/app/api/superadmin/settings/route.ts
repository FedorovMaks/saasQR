import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET — get platform settings + revenue stats
export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  // Get platform config
  const configs = await prisma.platformConfig.findMany();
  const settings: Record<string, string> = {};
  for (const c of configs) {
    settings[c.key] = c.value;
  }

  // Get revenue stats
  const payments = await prisma.subscriptionPayment.aggregate({
    where: { status: "succeeded" },
    _sum: { amount: true },
    _count: true,
  });

  // Monthly revenue (current month)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyPayments = await prisma.subscriptionPayment.aggregate({
    where: {
      status: "succeeded",
      createdAt: { gte: monthStart },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Recent payments
  const recentPayments = await prisma.subscriptionPayment.findMany({
    where: { status: "succeeded" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  return NextResponse.json({
    settings,
    revenue: {
      totalAmount: payments._sum.amount || 0,
      totalCount: payments._count,
      monthlyAmount: monthlyPayments._sum.amount || 0,
      monthlyCount: monthlyPayments._count,
      recentPayments,
    },
  });
}

// PATCH — update platform settings
const updateSchema = z.object({
  yookassaShopId: z.string().optional(),
  yookassaSecretKey: z.string().optional(),
});

export async function PATCH(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const body = await req.json();
  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const entries = Object.entries(result.data).filter(
    ([, v]) => v !== undefined
  );

  for (const [key, value] of entries) {
    await prisma.platformConfig.upsert({
      where: { key },
      create: { key, value: value as string },
      update: { value: value as string },
    });
  }

  return NextResponse.json({ success: true });
}
