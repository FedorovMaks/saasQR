"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push";
import { Bell, BellOff, BellRing, Loader2, Info, X } from "lucide-react";

export function PushToggle() {
  const { state, subscribe, unsubscribe } = usePushNotifications();
  const [showHelp, setShowHelp] = useState(false);

  if (state === "loading") {
    return (
      <button disabled className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#f0f0f0] px-5 text-sm font-extrabold text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  if (state === "unsupported") {
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

    return (
      <div className="space-y-2">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-50 px-5 text-sm font-extrabold text-amber-600 transition-all hover:bg-amber-100 active:scale-[0.97]"
        >
          <Info className="h-4 w-4" />
          Уведомления недоступны
        </button>
        {showHelp && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700 relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-2 right-2 text-amber-400 hover:text-amber-600"
            >
              <X className="h-4 w-4" />
            </button>
            {isIOS ? (
              <div className="space-y-2 pr-6">
                <p className="font-bold">Для уведомлений на iPhone:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Нажмите кнопку «Поделиться» (↑) внизу Safari</li>
                  <li>Выберите «На экран Домой»</li>
                  <li>Откройте приложение с домашнего экрана</li>
                  <li>Нажмите «Включить уведомления»</li>
                </ol>
              </div>
            ) : (
              <p className="pr-6">
                Ваш браузер не поддерживает push-уведомления. Попробуйте открыть в Chrome или установить приложение на домашний экран.
              </p>
            )}
          </div>
        )}
      </div>
    );
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
        onClick={() => {
          if (confirm("Отключить уведомления о новых заказах?")) unsubscribe();
        }}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-green-50 px-5 text-sm font-extrabold text-green-600 transition-all hover:bg-green-100 active:scale-[0.97]"
      >
        <BellRing className="h-4 w-4" />
        Уведомления включены
        <span className="ml-1 text-xs font-bold text-green-500/70">· отключить</span>
      </button>
    );
  }

  // unsubscribed
  return (
    <button
      onClick={subscribe}
      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#3c6e71] px-5 text-sm font-extrabold text-white shadow-md shadow-none transition-all hover:shadow-lg active:scale-[0.97]"
    >
      <Bell className="h-4 w-4" />
      Включить уведомления
    </button>
  );
}
