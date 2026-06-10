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
      <div className="border border-[#d9d9d9] bg-white p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-sm bg-[#eef6f6] flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-[#3c6e71]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[#1a1a1a]">Установить TapMenu</p>
          <p className="text-xs text-[#a0a0a0]">
            Быстрый доступ с главного экрана
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="h-8 w-8 rounded-sm flex items-center justify-center text-[#a0a0a0] hover:bg-[#f0f0f0] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={handleInstall}
            className="h-9 rounded-sm bg-[#3c6e71] px-4 text-xs font-semibold uppercase tracking-[0.04em] text-white transition-all hover:bg-[#325d5f] active:opacity-85"
          >
            Да
          </button>
        </div>
      </div>
    </div>
  );
}
