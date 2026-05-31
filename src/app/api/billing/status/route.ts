import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { hasActiveSubscription } from "@/lib/plans";

// Lightweight polling endpoint used by the "оплата обрабатывается" banner
// after returning from YooKassa, until the webhook activates the plan.
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const sub = await hasActiveSubscription(user.id);
  return NextResponse.json({
    active: sub.active,
    isTrial: "isTrial" in sub ? sub.isTrial : false,
  });
}
