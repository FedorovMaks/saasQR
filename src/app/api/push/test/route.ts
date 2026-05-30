import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { webpush } from "@/lib/web-push";

// Diagnostic: send a test push to the CURRENT user's own subscriptions.
// Returns detailed per-subscription results so issues can be diagnosed
// from the device itself (the waiter taps "Тест" and sees what happened).
export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: user.id },
  });

  const envOk =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY;

  if (subscriptions.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: "no_subscriptions",
      message:
        "Подписка на уведомления не найдена. Нажмите «Включить уведомления» ещё раз.",
      envOk,
    });
  }

  const payload = JSON.stringify({
    title: "Проверка уведомлений ✅",
    body: "Если вы видите это сообщение — push работает!",
    tag: `test-${Date.now()}`,
    url: "/admin",
  });

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { urgency: "high", TTL: 3600 }
        );
        return { ok: true, endpoint: sub.endpoint.slice(0, 40) };
      } catch (error: unknown) {
        const e = error as { statusCode?: number; body?: string; message?: string };
        // Clean up dead subscriptions
        if (e.statusCode === 410 || e.statusCode === 404) {
          await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
        }
        return {
          ok: false,
          endpoint: sub.endpoint.slice(0, 40),
          statusCode: e.statusCode,
          body: e.body,
          message: e.message,
        };
      }
    })
  );

  const sent = results.filter((r) => r.ok).length;

  return NextResponse.json({
    ok: sent > 0,
    sent,
    total: subscriptions.length,
    envOk,
    results,
  });
}
