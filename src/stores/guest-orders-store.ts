import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GuestOrderItem {
  name: string;
  quantity: number;
  variantLabel?: string;
}

export interface GuestOrder {
  id: string;
  orderNumber: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  venueId: string;
  items: GuestOrderItem[];
}

interface GuestOrdersState {
  orders: GuestOrder[];
  addOrder: (order: GuestOrder) => void;
  updateStatus: (orderId: string, status: string) => void;
  getActiveOrders: (venueId: string) => GuestOrder[];
  clearOldOrders: () => void;
}

export const useGuestOrdersStore = create<GuestOrdersState>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order) => {
        set({ orders: [order, ...get().orders] });
      },

      updateStatus: (orderId, status) => {
        set({
          orders: get().orders.map((o) =>
            o.id === orderId ? { ...o, status } : o
          ),
        });
      },

      getActiveOrders: (venueId) => {
        return get().orders.filter(
          (o) => o.venueId === venueId && o.status !== "DELIVERED" && o.status !== "CANCELLED"
        );
      },

      // Remove orders older than 24 hours
      clearOldOrders: () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        set({
          orders: get().orders.filter(
            (o) => new Date(o.createdAt).getTime() > cutoff
          ),
        });
      },
    }),
    {
      name: "qrmenu-guest-orders",
    }
  )
);
