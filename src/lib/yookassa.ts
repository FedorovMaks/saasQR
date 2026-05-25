/**
 * YooKassa API client for per-venue payment integration.
 * Docs: https://yookassa.ru/developers/api
 */

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
