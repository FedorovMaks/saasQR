/**
 * YooKassa API client.
 * Docs: https://yookassa.ru/developers/api
 *
 * Two flows:
 *  - Per-venue order payments (venue's own shopId/secretKey)
 *  - Platform subscription payments (platform shopId/secretKey from PlatformConfig)
 */

import { prisma } from "./prisma";

const YOOKASSA_API = "https://api.yookassa.ru/v3";

export type YooKassaPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  amount: {
    value: string;
    currency: string;
  };
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  paid: boolean;
  metadata?: Record<string, string>;
};

/**
 * Create a payment in YooKassa.
 * Uses per-venue credentials (shopId + secretKey).
 */
export async function createPayment(options: {
  shopId: string;
  secretKey: string;
  amount: number; // in kopecks
  currency?: string;
  description: string;
  returnUrl: string;
  orderId: string;
  venueId: string;
}): Promise<YooKassaPayment> {
  const {
    shopId,
    secretKey,
    amount,
    currency = "RUB",
    description,
    returnUrl,
    orderId,
    venueId,
  } = options;

  // Amount in rubles (YooKassa expects "123.45" format)
  const amountValue = (amount / 100).toFixed(2);

  const idempotencyKey = `order-${orderId}-${Date.now()}`;

  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
      "Idempotence-Key": idempotencyKey,
    },
    body: JSON.stringify({
      amount: {
        value: amountValue,
        currency,
      },
      // СБП только — приём оплаты заказов в TapMenu идёт по СБП
      payment_method_data: { type: "sbp" },
      confirmation: {
        type: "redirect",
        return_url: returnUrl,
      },
      capture: true, // auto-capture
      description,
      metadata: {
        order_id: orderId,
        venue_id: venueId,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("YooKassa create payment error:", res.status, error);
    throw new Error(`YooKassa error: ${res.status}`);
  }

  return res.json();
}

/**
 * Read the platform's YooKassa credentials from PlatformConfig.
 * Returns null if not configured yet (e.g. before самозанятость is ready).
 */
export async function getPlatformCredentials(): Promise<{
  shopId: string;
  secretKey: string;
} | null> {
  const configs = await prisma.platformConfig.findMany({
    where: { key: { in: ["yookassaShopId", "yookassaSecretKey"] } },
  });
  const map: Record<string, string> = {};
  for (const c of configs) map[c.key] = c.value;

  const shopId = map.yookassaShopId?.trim();
  const secretKey = map.yookassaSecretKey?.trim();
  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

/**
 * Create a platform SUBSCRIPTION payment via SBP (СБП only).
 * Uses the platform's credentials. Amount is computed by the caller
 * (server-side, from PLANS) and passed in kopecks.
 */
export async function createSubscriptionPayment(options: {
  shopId: string;
  secretKey: string;
  amount: number; // kopecks
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}): Promise<YooKassaPayment> {
  const { shopId, secretKey, amount, description, returnUrl, metadata, idempotencyKey } =
    options;

  const amountValue = (amount / 100).toFixed(2);

  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
      "Idempotence-Key": idempotencyKey,
    },
    body: JSON.stringify({
      amount: { value: amountValue, currency: "RUB" },
      // СБП только
      payment_method_data: { type: "sbp" },
      confirmation: {
        type: "redirect",
        return_url: returnUrl,
      },
      capture: true,
      description,
      metadata,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("YooKassa subscription payment error:", res.status, error);
    throw new Error(`YooKassa error: ${res.status}`);
  }

  return res.json();
}

/**
 * Get payment status from YooKassa.
 */
export async function getPayment(options: {
  shopId: string;
  secretKey: string;
  paymentId: string;
}): Promise<YooKassaPayment> {
  const { shopId, secretKey, paymentId } = options;

  const res = await fetch(`${YOOKASSA_API}/payments/${paymentId}`, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
    },
  });

  if (!res.ok) {
    throw new Error(`YooKassa error: ${res.status}`);
  }

  return res.json();
}

/**
 * Verify webhook notification from YooKassa.
 * YooKassa sends notifications from specific IPs.
 * In production, also verify the notification object structure.
 */
export function parseWebhookEvent(body: unknown): {
  type: string;
  event: string;
  object: YooKassaPayment;
} | null {
  try {
    const data = body as {
      type: string;
      event: string;
      object: YooKassaPayment;
    };
    if (!data.event || !data.object?.id) return null;
    return data;
  } catch {
    return null;
  }
}
