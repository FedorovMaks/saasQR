"use client";

import { usePushNotifications } from "@/hooks/use-push";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

export function PushToggle() {
  const { state, subscribe, unsubscribe } = usePushNotifications();

  if (state === "loading") {
    return (
      <button disabled className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f2f8] px-5 text-sm font-extrabold text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  if (state === "unsupported") {
    return null; // Don't show if not supported
  }

  if (state === "denied") {
    return (
      <div className="inline-flex h-11 items-center gap-2 rounded-2xl bg-red-50 px-5 text-sm font-bold text-red-500">
        <BellOff className="h-4 w-4" />
        Уведомления заблокированы
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-green-50 px-5 text-sm font-extrabold text-green-600 transition-all hover:bg-green-100 active:scale-[0.97]"
      >
        <BellRing className="h-4 w-4" />
        Уведомления включены
      </button>
    );
  }

  // unsubscribed
  return (
    <button
      onClick={subscribe}
      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2563eb] px-5 text-sm font-extrabold text-white shadow-md shadow-blue-500/15 transition-all hover:shadow-lg active:scale-[0.97]"
    >
      <Bell className="h-4 w-4" />
      Включить уведомления
    </button>
  );
}
