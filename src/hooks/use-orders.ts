"use client";

import { useEffect, useRef, useCallback } from "react";

type OrderEvent = {
  type: "new_order" | "waiter_call";
  venueId: string;
  order?: Record<string, unknown>;
  tableNumber?: string;
  timestamp?: string;
};

export type OrderFromAPI = {
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

/**
 * Polling-based order stream with full refresh on every poll.
 *
 * - `onEvent`: called for NEW orders only (for sound/toast)
 * - `onRefresh`: called every poll with the full server order list
 *    → component always reflects real server state, fixes stale statuses
 * - `initialOrders`: seeds known order IDs so the first poll
 *    doesn't false-trigger "new order" sounds for existing orders
 */
export function useOrderStream(
  venueId: string,
  onEvent: (event: OrderEvent) => void,
  onRefresh?: (orders: OrderFromAPI[]) => void,
  initialOrders?: { id: string }[]
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Track known order IDs to detect truly NEW orders for sound/notification
  const knownOrderIdsRef = useRef<Set<string>>(
    new Set(initialOrders?.map((o) => o.id) || [])
  );
  // If initialOrders provided, we already know the baseline — no skip needed
  const initializedRef = useRef(!!initialOrders?.length);

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
          // First poll without initialOrders — just populate known IDs
          for (const order of orders) {
            knownOrderIdsRef.current.add(order.id);
          }
          initializedRef.current = true;
        } else {
          // Detect truly new orders (for sound/notification)
          for (const order of orders) {
            if (!knownOrderIdsRef.current.has(order.id)) {
              knownOrderIdsRef.current.add(order.id);
              onEventRef.current({
                type: "new_order",
                venueId,
                order: order as unknown as Record<string, unknown>,
              });
            }
          }
        }

        // ALWAYS send full refresh to component — this is the key fix:
        // status changes, new orders, payment updates — all reflected
        // from actual server state, not stale local state
        onRefreshRef.current?.(orders);
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

// Single shared AudioContext — iOS requires it to be created/resumed
// during a user gesture, otherwise it stays "suspended" and is silent.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedCtx) {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      sharedCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return sharedCtx;
}

/**
 * Unlock audio playback. MUST be called from a user gesture (tap/click)
 * so iOS allows later programmatic sounds while the app is open.
 */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  // Play a 1-sample silent buffer to fully unlock on iOS Safari
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // ignore
  }
}

export function useSound() {
  const playSound = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Resume in case it got suspended (iOS suspends on backgrounding)
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    try {
      const beep = (freq: number, at: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime + at);
        osc.start(ctx.currentTime + at);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.5);
        osc.stop(ctx.currentTime + at + 0.5);
      };
      beep(800, 0);
      beep(1000, 0.25);
    } catch {
      // Audio not available
    }
  }, []);

  return playSound;
}
