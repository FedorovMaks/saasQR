import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

// Save push subscription
export async function POST(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const result = subscribeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { endpoint, keys } = result.data;

  // Remove this user's OTHER subscriptions — re-installing the PWA creates
  // a fresh endpoint each time, leaving stale dead subscriptions behind.
  // A waiter uses one device, so keep only the current (live) endpoint.
  await prisma.pushSubscription.deleteMany({
    where: { userId: user.id, endpoint: { not: endpoint } },
  });

  // Upsert the current device's subscription
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      userId: user.id,
    },
    create: {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}

// Remove push subscription
export async function DELETE(req: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { endpoint } = body;

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    });
  }

  return NextResponse.json({ ok: true });
}
