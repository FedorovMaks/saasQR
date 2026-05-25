import { EventEmitter } from "events";

// Global singleton for broadcasting order events
const globalForEvents = globalThis as unknown as {
  orderEmitter: EventEmitter | undefined;
};

export const orderEmitter =
  globalForEvents.orderEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.orderEmitter = orderEmitter;
}

// Increase max listeners since each SSE connection adds one
orderEmitter.setMaxListeners(50);

export type OrderEvent = {
  type: "new_order" | "status_change";
  venueId: string;
  order: Record<string, unknown>;
};

export type WaiterCallEvent = {
  type: "waiter_call";
  venueId: string;
  tableNumber: string;
  timestamp: string;
};

export type VenueEvent = OrderEvent | WaiterCallEvent;

export function emitOrderEvent(event: OrderEvent) {
  orderEmitter.emit(`venue:${event.venueId}`, event);
  // Also emit per-order so guest can subscribe to their specific order
  const orderId = event.order.id as string;
  if (orderId) {
    orderEmitter.emit(`order:${orderId}`, event);
  }
}

export function emitWaiterCall(venueId: string, tableNumber: string) {
  const event: WaiterCallEvent = {
    type: "waiter_call",
    venueId,
    tableNumber,
    timestamp: new Date().toISOString(),
  };
  orderEmitter.emit(`venue:${venueId}`, event);
}
