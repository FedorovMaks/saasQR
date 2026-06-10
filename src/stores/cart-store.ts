import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  menuItemId: string;
  variantId?: string;
  name: string;
  variantLabel?: string;
  price: number; // kopecks
  quantity: number;
  imageUrl?: string | null;
}

interface CartState {
  items: CartItem[];
  venueId: string | null;
  tableNumber: string;
  comment: string;

  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (menuItemId: string, variantId?: string) => void;
  updateQuantity: (
    menuItemId: string,
    quantity: number,
    variantId?: string
  ) => void;
  setTableNumber: (table: string) => void;
  setComment: (comment: string) => void;
  clearCart: () => void;
  setVenueId: (id: string) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

function getKey(menuItemId: string, variantId?: string) {
  return variantId ? `${menuItemId}:${variantId}` : menuItemId;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      venueId: null,
      tableNumber: "",
      comment: "",

      addItem: (item) => {
        const state = get();
        const key = getKey(item.menuItemId, item.variantId);
        const existing = state.items.find(
          (i) => getKey(i.menuItemId, i.variantId) === key
        );

        if (existing) {
          set({
            items: state.items.map((i) =>
              getKey(i.menuItemId, i.variantId) === key
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({ items: [...state.items, { ...item, quantity: 1 }] });
        }
      },

      removeItem: (menuItemId, variantId) => {
        const key = getKey(menuItemId, variantId);
        set({
          items: get().items.filter(
            (i) => getKey(i.menuItemId, i.variantId) !== key
          ),
        });
      },

      updateQuantity: (menuItemId, quantity, variantId) => {
        const key = getKey(menuItemId, variantId);
        if (quantity <= 0) {
          set({
            items: get().items.filter(
              (i) => getKey(i.menuItemId, i.variantId) !== key
            ),
          });
        } else {
          set({
            items: get().items.map((i) =>
              getKey(i.menuItemId, i.variantId) === key
                ? { ...i, quantity }
                : i
            ),
          });
        }
      },

      setTableNumber: (tableNumber) => set({ tableNumber }),
      setComment: (comment) => set({ comment }),
      setVenueId: (venueId) => {
        // Clear cart if switching venues
        if (get().venueId && get().venueId !== venueId) {
          set({ items: [], venueId, comment: "", tableNumber: "" });
        } else {
          set({ venueId });
        }
      },
      clearCart: () =>
        set({ items: [], comment: "", tableNumber: "" }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "tapmenu-cart",
    }
  )
);
