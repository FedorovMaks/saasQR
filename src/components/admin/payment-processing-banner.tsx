"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

// Shown after returning from YooKassa (return_url has ?status=processing).
// СБП confirms asynchronously, so we poll the subscription status until the
// webhook activates the plan, then refresh the page.
export function PaymentProcessingBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const isProcessing = params.get("status") === "processing";

  useEffect(() => {
    if (!isProcessing) return;

    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (!active) return;
      attempts++;
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            setDone(true);
            // refresh server components to reflect the new plan
            router.refresh();
            setTimeout(() => {
              if (active) router.replace("/admin/billing");
            }, 2500);
            return;
          }
        }
      } catch {
        // ignore
      }
      // Poll for ~2 minutes (40 × 3s), then stop
      if (active && attempts < 40) {
        timer = setTimeout(poll, 3000);
      }
    }

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [isProcessing, router]);

  if (!isProcessing) return null;

  if (done) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <p className="font-extrabold text-green-700">
          Оплата прошла — подписка активирована!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#eef6f6] border border-[#a9d1d3] px-5 py-4 flex items-center gap-3">
      <Loader2 className="h-5 w-5 text-[#3c6e71] shrink-0 animate-spin" />
      <div>
        <p className="font-extrabold text-[#3c6e71]">Оплата обрабатывается…</p>
        <p className="text-sm text-blue-500/80 font-semibold">
          Подтверждение СБП может занять несколько секунд. Страница обновится
          автоматически.
        </p>
      </div>
    </div>
  );
}
