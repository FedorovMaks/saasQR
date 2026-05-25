import { prisma } from "@/lib/prisma";
import { sendPushNotification, type PushPayload } from "@/lib/web-push";

/**
 * Send push notification to all subscriptions of a venue's owner.
 * Automatically removes expired subscriptions.
 */
export async function sendPushToVenueOwner(
  venueId: string,
  payload: PushPayload
) {
  // Find venue owner
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { ownerId: true },
  });

  if (!venue) return;

  // Get all push subscriptions for this user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: venue.ownerId },
  });

  if (subscriptions.length === 0) return;

  // Send to all subscriptions in parallel
  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      return { id: sub.id, result };
    })
  );

  // Clean up expired subscriptions
  const expiredIds = results
    .filter((r) => r.result === "expired")
    .map((r) => r.id);

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } },
    });
  }
}
