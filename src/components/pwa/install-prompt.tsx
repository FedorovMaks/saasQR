"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  }

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.12)] flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-[#2563eb]/10 flex items-center justify-center shrink-0">
          <Download className="h-6 w-6 text-[#2563eb]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm">Установить QRMenu</p>
          <p className="text-xs text-gray-400 font-medium">
            Быстрый доступ с главного экрана
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={handleInstall}
            className="h-10 rounded-xl bg-[#2563eb] px-4 text-sm font-extrabold text-white shadow-md shadow-blue-500/15 transition-all hover:shadow-lg active:scale-[0.97]"
          >
            Да
          </button>
        </div>
      </div>
    </div>
  );
}
