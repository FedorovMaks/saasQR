"use client";

import Link from "next/link";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { useState } from "react";

type ExpiryState = "ok" | "expiring-soon" | "grace" | "expired";

export function ExpiryBanner({
  plan,
  planExpiresAt,
  graceDays,
}: {
  plan: string;
  planExpiresAt: string | null;
  graceDays: number;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (!planExpiresAt || plan === "BASIC" || dismissed) return null;

  const expiresAt = new Date(planExpiresAt).getTime();
  const now = Date.now();
  const graceMs = graceDays * 24 * 60 * 60 * 1000;
  const graceEnd = expiresAt + graceMs;

  let state: ExpiryState = "ok";
  const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
  const hoursUntilGraceEnd = Math.max(0, Math.ceil((graceEnd - now) / (1000 * 60 * 60)));

  if (now > graceEnd) {
    state = "expired";
  } else if (now > expiresAt) {
    state = "grace";
  } else if (daysUntilExpiry <= 7) {
    state = "expiring-soon";
  }

  if (state === "ok") return null;

  const config = {
    "expiring-soon": {
      icon: Clock,
      bg: "bg-[#fef8ec]",
      border: "border-[#d4a83a]",
      text: "text-[#9a7209]",
      message: `Подписка истекает через ${daysUntilExpiry} ${pluralDays(daysUntilExpiry)}`,
      cta: "Продлить",
    },
    grace: {
      icon: AlertTriangle,
      bg: "bg-[#fef0f0]",
      border: "border-[#d4a0a0]",
      text: "text-[#a82828]",
      message: `Подписка истекла! Осталось ${hoursUntilGraceEnd} ч — потом доступ ограничится`,
      cta: "Продлить сейчас",
    },
    expired: {
      icon: XCircle,
      bg: "bg-[#fef0f0]",
      border: "border-[#a82828]",
      text: "text-[#a82828]",
      message: "Подписка истекла. Функции ограничены до «Базового» тарифа",
      cta: "Оформить подписку",
    },
  }[state];

  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} ${config.text} border px-4 py-3 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{config.message}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/admin/billing"
          className={`text-xs font-bold uppercase tracking-[0.04em] ${config.text} hover:underline`}
        >
          {config.cta}
        </Link>
        {state === "expiring-soon" && (
          <button
            onClick={() => setDismissed(true)}
            className="text-[#a0a0a0] hover:text-[#7a7a7a] ml-1"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "дней";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дня";
  return "дней";
}
