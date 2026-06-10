"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PlanSwitchButton({
  planKey,
  planLabel,
  isHighlighted,
}: {
  planKey: string;
  planLabel: string;
  isHighlighted: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSwitch() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      if (res.ok) {
        toast.success(`Тариф «${planLabel}» активирован на 30 дней`);
        // Force session refresh by reloading page
        router.refresh();
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || "Ошибка смены тарифа");
      }
    } catch {
      toast.error("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={loading}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition-all active:scale-[0.97] disabled:opacity-50 ${
        isHighlighted
          ? "bg-[#3c6e71] text-white shadow-lg shadow-none hover:shadow-xl"
          : "bg-[#f0f0f0] text-gray-600 hover:bg-[#e4e8f2]"
      }`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        `Выбрать «${planLabel}»`
      )}
    </button>
  );
}
