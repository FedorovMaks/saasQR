"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        setRegistration(reg);

        // Check existing subscription
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setState("subscribed");
        } else if (Notification.permission === "denied") {
          setState("denied");
        } else {
          setState("unsubscribed");
        }
      })
      .catch(() => {
        setState("unsupported");
      });
  }, []);

  const subscribe = useCallback(async () => {
    if (!registration) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (res.ok) {
        setState("subscribed");
      }
    } catch (err) {
      console.error("Push subscribe error:", err);
    }
  }, [registration]);

  const unsubscribe = useCallback(async () => {
    if (!registration) return;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
      }
      setState("unsubscribed");
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    }
  }, [registration]);

  return { state, subscribe, unsubscribe };
}
