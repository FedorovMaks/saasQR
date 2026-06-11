import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { z } from "zod";
import { checkVenueLimit, hasActiveSubscription, PLANS } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import {
  getPlatformCredentials,
  createSubscriptionPayment,
} from "@/lib/yookassa";
import { venueSchema } from "@/lib/validators";

const schema = z.object({
  venue: venueSchema,
});

export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

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
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const sub = await hasActiveSubscription(user.id);
  if (!sub.active) {
    return NextResponse.json(
      { error: "Нет активной подписки" },
      { status: 403 }
    );
  }

  const limitCheck = await checkVenueLimit(user.id);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: limitCheck.reason },
      { status: 403 }
    );
  }

  if (!("isExtra" in limitCheck) || !limitCheck.isExtra) {
    return NextResponse.json(
      { error: "Дополнительная оплата не требуется — создайте заведение обычным способом" },
      { status: 400 }
    );
  }

  const venueData = parsed.data.venue;
  const copyMenuFromVenueId =
    typeof body.copyMenuFromVenueId === "string" ? body.copyMenuFromVenueId : null;

  const existingVenue = await prisma.venue.findUnique({
    where: { slug: venueData.slug },
  });
  if (existingVenue) {
    return NextResponse.json(
      { error: "Такой slug уже занят. Выберите другой." },
      { status: 409 }
    );
  }

  const creds = await getPlatformCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Оплата пока недоступна. Платёжная система ещё не подключена." },
      { status: 503 }
    );
  }

  const planConfig = PLANS[limitCheck.plan!];
  const amount = planConfig.extraVenuePrice * 100; // kopecks

  const origin =
    req.headers.get("origin") ||
    req.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
    "";
  const returnUrl = `${origin}/admin?extra_venue=processing`;

  const record = await prisma.subscriptionPayment.create({
    data: {
      userId: user.id,
      amount,
      type: "EXTRA_VENUE",
      plan: limitCheck.plan!,
      status: "pending",
      venueData: { ...venueData, copyMenuFromVenueId } as object,
    },
  });

  try {
    const payment = await createSubscriptionPayment({
      shopId: creds.shopId,
      secretKey: creds.secretKey,
      amount,
      description: `Доп. заведение «${venueData.name}» — ${planConfig.extraVenuePrice.toLocaleString("ru-RU")} ₽/мес`,
      returnUrl,
      idempotencyKey: `extra-venue-${user.id}-${record.id}`,
      metadata: {
        kind: "extra_venue",
        userId: user.id,
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
