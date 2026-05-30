import { prisma } from "@/lib/prisma";
import { sendPushNotification, type PushPayload } from "@/lib/web-push";

/**
 * Send push notification to venue owner AND all active staff.
 * Automatically removes expired subscriptions.
 */
export async function sendPushToVenueTeam(
  venueId: string,
  payload: PushPayload
) {
  // Find venue owner
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { ownerId: true },
  });

  if (!venue) return;

  // Get active staff for this venue
  const activeStaff = await prisma.staff.findMany({
    where: { venueId, isActive: true },
    select: { userId: true },
  });

  // All team members: owner + active staff
  const userIds = [venue.ownerId, ...activeStaff.map((s) => s.userId)];

  // Get all push subscriptions for these users
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
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
