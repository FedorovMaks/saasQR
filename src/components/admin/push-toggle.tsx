"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push";
import { Bell, BellOff, BellRing, Loader2, Info, X } from "lucide-react";

export function PushToggle() {
  const { state, subscribe, unsubscribe } = usePushNotifications();
  const [showHelp, setShowHelp] = useState(false);

  if (state === "loading") {
    return (
      <button disabled className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d9d9d9] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#a0a0a0]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </button>
    );
  }

  if (state === "unsupported") {
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

    return (
      <div className="space-y-2">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#d4a83a] bg-[#fef8ec] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#9a7209] transition-all hover:bg-[#f5ebd0] active:opacity-85"
        >
          <Info className="h-3.5 w-3.5" />
          Недоступно
        </button>
        {showHelp && (
          <div className="border border-[#d4a83a] bg-[#fef8ec] p-4 text-sm text-[#9a7209] relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-2 right-2 text-[#d4a83a] hover:text-[#9a7209]"
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
      <div className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#e8b4b4] bg-[#fdf0f0] px-4 text-xs font-bold uppercase tracking-[0.04em] text-[#a82828]">
        <BellOff className="h-3.5 w-3.5" />
        Заблокир.
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <button
        onClick={() => {
          if (confirm("Отключить уведомления о новых заказах?")) unsubscribe();
        }}
        className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#b3d9c0] bg-[#eef7f0] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-[#256841] transition-all hover:bg-[#ddf0e2] active:opacity-85"
      >
        <BellRing className="h-3.5 w-3.5" />
        Увед. вкл.
      </button>
    );
  }

  // unsubscribed
  return (
    <button
      onClick={subscribe}
      className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#3c6e71] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85"
    >
      <Bell className="h-3.5 w-3.5" />
      Включить уведомления
    </button>
  );
}
