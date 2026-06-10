import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
  "mailto:admin@tap-menu.ru",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export { webpush };

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      {
        // High urgency = APNs priority 10 → iOS delivers immediately
        // instead of batching/delaying for power saving
        urgency: "high",
        TTL: 3600,
      }
    );
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    // 410 Gone or 404 = subscription expired, should be removed
    if (statusCode === 410 || statusCode === 404) {
      return "expired";
    }
    console.error("Push send error:", error);
    return false;
  }
}
