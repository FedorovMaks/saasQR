import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLANS, GRACE_DAYS, isExpired } from "@/lib/plans";
import {
  sendExpiryWarningEmail,
  sendExpiryGraceEmail,
  sendExpiryDowngradedEmail,
} from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Fail-closed: if no secret is configured, the endpoint is disabled entirely
  // rather than left open to anyone who can trigger email sends.
  if (!CRON_SECRET) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const graceMs = GRACE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  const users = await prisma.user.findMany({
    where: {
      plan: { not: "BASIC" },
      planExpiresAt: { not: null },
      isSuperAdmin: false,
    },
    select: {
      id: true,
      email: true,
      plan: true,
      planExpiresAt: true,
      expiryEmailSent: true,
    },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    const expiresAt = user.planExpiresAt!.getTime();
    const graceEnd = expiresAt + graceMs;
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    const hoursUntilGraceEnd = Math.max(0, Math.ceil((graceEnd - now) / (1000 * 60 * 60)));
    const planLabel = PLANS[user.plan]?.label ?? user.plan;

    try {
      // State: fully expired (past grace) — send downgraded email
      if (isExpired(user.planExpiresAt) && user.expiryEmailSent !== "downgraded") {
        await sendExpiryDowngradedEmail(user.email, planLabel);
        await prisma.user.update({
          where: { id: user.id },
          data: { expiryEmailSent: "downgraded" },
        });
        sent++;
        continue;
      }

      // State: in grace period (expired but within grace)
      if (now > expiresAt && now <= graceEnd && user.expiryEmailSent !== "grace" && user.expiryEmailSent !== "downgraded") {
        await sendExpiryGraceEmail(user.email, hoursUntilGraceEnd, planLabel);
        await prisma.user.update({
          where: { id: user.id },
          data: { expiryEmailSent: "grace" },
        });
        sent++;
        continue;
      }

      // State: expiring within 3 days
      if (daysLeft > 0 && daysLeft <= 3 && (expiresAt - now) < threeDaysMs && !user.expiryEmailSent) {
        await sendExpiryWarningEmail(user.email, daysLeft, planLabel);
        await prisma.user.update({
          where: { id: user.id },
          data: { expiryEmailSent: "warning" },
        });
        sent++;
        continue;
      }
    } catch (e) {
      errors.push(`${user.email}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return NextResponse.json({
    checked: users.length,
    sent,
    errors: errors.length ? errors : undefined,
  });
}
