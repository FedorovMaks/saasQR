import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { hasActiveSubscription, TRIAL_CONFIG } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import {
  getPlatformCredentials,
  createSubscriptionPayment,
} from "@/lib/yookassa";

// Start the 1₽ / 7-day PRO trial (СБП). Trial is allowed strictly once.
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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { trialUsed: true },
  });

  if (dbUser?.trialUsed) {
    return NextResponse.json(
      { error: "Пробный период уже был использован" },
      { status: 400 }
    );
  }

  const sub = await hasActiveSubscription(user.id);
  if (sub.active) {
    return NextResponse.json(
      { error: "У вас уже есть активная подписка" },
      { status: 400 }
    );
  }

  const creds = await getPlatformCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Оплата пока недоступна. Платёжная система ещё не подключена." },
      { status: 503 }
    );
  }

  const origin =
    req.headers.get("origin") ||
    req.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
    "";
  const returnUrl = `${origin}/admin/billing?status=processing`;

  // Create a pending payment record first so the webhook can match it
  const record = await prisma.subscriptionPayment.create({
    data: {
      userId: user.id,
      amount: TRIAL_CONFIG.price * 100, // kopecks
      type: "TRIAL",
      plan: TRIAL_CONFIG.plan,
      status: "pending",
    },
  });

  try {
    const payment = await createSubscriptionPayment({
      shopId: creds.shopId,
      secretKey: creds.secretKey,
      amount: TRIAL_CONFIG.price * 100,
      description: `Пробный период «Про» — ${TRIAL_CONFIG.durationDays} дней`,
      returnUrl,
      idempotencyKey: `trial-${user.id}-${record.id}`,
      metadata: {
        kind: "subscription",
        type: "TRIAL",
        userId: user.id,
        plan: TRIAL_CONFIG.plan,
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
