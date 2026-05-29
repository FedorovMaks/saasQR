"use client";

import { useEffect, useRef, useCallback } from "react";

type OrderEvent = {
  type: "new_order" | "status_change" | "waiter_call";
  venueId: string;
  order?: Record<string, unknown>;
  tableNumber?: string;
  timestamp?: string;
};

type OrderFromAPI = {
  id: string;
  orderNumber: number;
  tableNumber: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  comment: string | null;
  createdAt: string;
  items: {
    id: string;
    itemName: string;
    variantLabel: string | null;
    quantity: number;
    priceAtOrder: number;
  }[];
};

// Polling-based order stream (replaces SSE for Vercel compatibility)
export function useOrderStream(
  venueId: string,
  onEvent: (event: OrderEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const knownOrdersRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (!active) return;
      try {
        const res = await fetch(`/api/venues/${venueId}/orders`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) {
          // If 401 — session expired, reload page to redirect to login
          if (res.status === 401) {
            window.location.reload();
            return;
          }
          return;
        }
        const orders: OrderFromAPI[] = await res.json();

        if (!initializedRef.current) {
          // First poll — just populate the known orders map
          for (const order of orders) {
            knownOrdersRef.current.set(order.id, order.status);
          }
          initializedRef.current = true;
          return;
        }

        for (const order of orders) {
          const knownStatus = knownOrdersRef.current.get(order.id);

          if (knownStatus === undefined) {
            // New order
            knownOrdersRef.current.set(order.id, order.status);
            onEventRef.current({
              type: "new_order",
              venueId,
              order: order as unknown as Record<string, unknown>,
            });
          } else if (knownStatus !== order.status) {
            // Status changed
            knownOrdersRef.current.set(order.id, order.status);
            onEventRef.current({
              type: "status_change",
              venueId,
              order: order as unknown as Record<string, unknown>,
            });
          }
        }
      } catch {
        // ignore poll errors
      }

      // Schedule next poll
      if (active) {
        pollTimer = setTimeout(poll, 4000);
      }
    }

    // Start polling
    poll();

    // Resume polling when app returns from background (PWA / tab switch)
    function handleVisibility() {
      if (document.visibilityState === "visible" && active) {
        // Cancel pending poll and poll immediately
        if (pollTimer) clearTimeout(pollTimer);
        poll();
      }
    }

    // Also poll on focus (catches iOS PWA resume)
    function handleFocus() {
      if (active) {
        if (pollTimer) clearTimeout(pollTimer);
        poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handleFocus);

    return () => {
      active = false;
      if (pollTimer) clearTimeout(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
    };
  }, [venueId]);
}

export function useSound() {
  const playSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);

      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch {
      // Audio not available
    }
  }, []);

  return playSound;
}
