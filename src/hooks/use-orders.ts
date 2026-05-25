"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type OrderEvent = {
  type: "new_order" | "status_change" | "waiter_call";
  venueId: string;
  order?: Record<string, unknown>;
  tableNumber?: string;
  timestamp?: string;
};

export function useOrderStream(
  venueId: string,
  onEvent: (event: OrderEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/orders/stream?venueId=${venueId}`
    );

    eventSource.onmessage = (e) => {
      try {
        const event: OrderEvent = JSON.parse(e.data);
        onEventRef.current(event);
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      eventSource.close();
    };
  }, [venueId]);
}

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a simple beep using Web Audio API
    audioRef.current = null; // Will use Web Audio API instead
  }, []);

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
