import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { z } from "zod";
import { PLANS, getPlanPriceKopecks, hasActiveSubscription } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import {
  getPlatformCredentials,
  createSubscriptionPayment,
} from "@/lib/yookassa";

const schema = z.object({
  plan: z.enum(["BASIC", "BUSINESS", "PRO"]),
  period: z.enum(["monthly", "yearly"]),
});

// Buy / renew a paid plan via SBP. Amount is computed server-side from PLANS.
export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  // Rate limit: max 5 payment attempts per user per 10 minutes
  const limit = rateLimit(`billing:${user.id}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  const { plan, period } = parsed.data;

  const creds = await getPlatformCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Оплата пока недоступна. Платёжная система ещё не подключена." },
      { status: 503 }
    );
  }

  // Renewal if the user already has an active subscription, otherwise new purchase
  const sub = await hasActiveSubscription(user.id);
  const paymentType = sub.active ? "RENEWAL" : "SUBSCRIPTION";

  const amount = getPlanPriceKopecks(plan, period);
  const planLabel = PLANS[plan].label;
  const periodLabel = period === "yearly" ? "год" : "месяц";

  const origin =
    req.headers.get("origin") ||
    req.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
    "";
  const returnUrl = `${origin}/admin/billing?status=processing`;

  const record = await prisma.subscriptionPayment.create({
    data: {
      userId: user.id,
      amount,
      type: paymentType,
      plan,
      status: "pending",
    },
  });

  try {
    const payment = await createSubscriptionPayment({
      shopId: creds.shopId,
      secretKey: creds.secretKey,
      amount,
      description: `Тариф «${planLabel}» — ${periodLabel}`,
      returnUrl,
      idempotencyKey: `sub-${user.id}-${record.id}`,
      metadata: {
        kind: "subscription",
        type: paymentType,
        userId: user.id,
        plan,
        period,
        recordId: record.id,
      },
    });

    await prisma.subscriptionPayment.update({
      where: { id: record.id },
      data: { yookassaId: payment.id },
    });

    return NextResponse.json({
      confirmationUrl: payment.confirmation?.confirmation_url,
    });
  } catch {
    await prisma.subscriptionPayment.update({
      where: { id: record.id },
      data: { status: "cancelled" },
    });
    return NextResponse.json(
      { error: "Не удалось создать платёж. Попробуйте позже." },
      { status: 502 }
    );
  }
}
