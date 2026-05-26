import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Plan } from "@/generated/prisma";
import { z } from "zod";

const schema = z.object({
  plan: z.enum(["BASIC", "BUSINESS", "PRO"]),
});

// Switch plan (dev mode — no payment required)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Некорректный тариф" },
        { status: 400 }
      );
    }

    const newPlan = result.data.plan as Plan;

    // Set plan with 30-day expiry (or null for BASIC)
    const planExpiresAt =
      newPlan === "BASIC"
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        plan: newPlan,
        planExpiresAt,
      },
      select: { plan: true, planExpiresAt: true },
    });

    return NextResponse.json({
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
