import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/auth-guard";
import { hasActiveSubscription } from "@/lib/plans";
import { reconcileUserPendingPayments } from "@/lib/billing-reconcile";

// Lightweight polling endpoint used by the "оплата обрабатывается" banner
// after returning from YooKassa.
//
// Primary activation path is the YooKassa webhook, but it can be delayed or
// not delivered at all (e.g. for freshly-activated shops). As a fallback we
// actively reconcile any pending payment against YooKassa here, so the plan
// activates from this poll even if the webhook never arrives.
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  try {
    await reconcileUserPendingPayments(user.id);
  } catch {
    // never break status polling because of a reconcile error
  }

  const sub = await hasActiveSubscription(user.id);
  return NextResponse.json({
    active: sub.active,
    isTrial: "isTrial" in sub ? sub.isTrial : false,
  });
}
