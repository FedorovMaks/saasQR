import { prisma } from "./prisma";
import { getPlatformCredentials, getPayment, type YooKassaPayment } from "./yookassa";
import {
  activateTrial,
  activatePlan,
  getPeriodFromAmountKopecks,
  type BillingPeriod,
} from "./plans";

/**
 * Fallback reconciliation for subscription payments.
 *
 * YooKassa webhooks are best-effort and may be delayed or not delivered at all
 * (notably for freshly-activated shops). This actively verifies a user's
 * PENDING subscription payments directly against YooKassa and activates the
 * plan if the payment is confirmed paid — so activation never depends solely
 * on the webhook. Called from the /api/billing/status polling endpoint.
 *
 * It applies the same safety checks as the webhook handler: it trusts only the
 * payment data returned by YooKassa (re-fetched server-side), and binds it to
 * our own DB record by recordId + amount before activating.
 *
 * Returns true if anything was activated.
 */
export async function reconcileUserPendingPayments(
  userId: string
): Promise<boolean> {
  const creds = await getPlatformCredentials();
  if (!creds) return false;

  const pending = await prisma.subscriptionPayment.findMany({
    where: { userId, status: "pending", yookassaId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  if (pending.length === 0) return false;

  let activated = false;

  for (const record of pending) {
    if (!record.yookassaId) continue;

    let verified: YooKassaPayment;
    try {
      verified = await getPayment({
        shopId: creds.shopId,
        secretKey: creds.secretKey,
        paymentId: record.yookassaId,
      });
    } catch {
      continue; // can't verify right now — try again on the next poll
    }

    if (verified.status === "canceled") {
      await prisma.subscriptionPayment.updateMany({
        where: { id: record.id, status: "pending" },
        data: { status: "cancelled" },
      });
      continue;
    }

    if (verified.status !== "succeeded" || !verified.paid) continue;

    // Bind the verified payment to THIS record and the charged amount.
    if (verified.metadata?.recordId !== record.id) continue;
    const expectedValue = (record.amount / 100).toFixed(2);
    if (verified.amount?.value !== expectedValue) continue;

    // Atomic claim: only the first caller (poll or webhook) flips it.
    const claimed = await prisma.subscriptionPayment.updateMany({
      where: { id: record.id, status: "pending" },
      data: { status: "succeeded" },
    });
    if (claimed.count === 0) continue; // already handled elsewhere

    if (record.type === "EXTRA_VENUE") {
      // Create the venue from stored data
      const venueData = record.venueData as {
        name: string;
        slug: string;
        description?: string;
        address?: string;
        logoUrl?: string;
        accentColor?: string;
      } | null;

      if (venueData) {
        const existing = await prisma.venue.findUnique({
          where: { slug: venueData.slug },
        });
        if (!existing) {
          await prisma.venue.create({
            data: {
              name: venueData.name,
              slug: venueData.slug,
              description: venueData.description || null,
              address: venueData.address || null,
              logoUrl: venueData.logoUrl || null,
              accentColor: venueData.accentColor || "#3c6e71",
              ownerId: record.userId,
            },
          });
        }
      }
      activated = true;
      continue;
    }

    const periodStart = new Date();
    let periodEnd: Date;
    if (record.type === "TRIAL") {
      periodEnd = await activateTrial(record.userId);
    } else {
      const period: BillingPeriod =
        getPeriodFromAmountKopecks(record.plan, record.amount) ?? "monthly";
      periodEnd = await activatePlan(record.userId, record.plan, period);
    }

    await prisma.subscriptionPayment.update({
      where: { id: record.id },
      data: { periodStart, periodEnd },
    });

    activated = true;
  }

  return activated;
}
