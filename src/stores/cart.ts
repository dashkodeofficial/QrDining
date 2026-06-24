"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLine } from "@/lib/types/db";

interface CartState {
  lines: CartLine[];
  _hasHydrated: boolean;
  add: (line: Omit<CartLine, "quantity" | "notes"> & { quantity?: number; notes?: string }) => void;
  setQuantity: (menu_item_id: string, quantity: number) => void;
  setNotes: (menu_item_id: string, notes: string) => void;
  remove: (menu_item_id: string) => void;
  clear: () => void;
  count: () => number;
  totalCents: () => number;
  setHasHydrated: (v: boolean) => void;
}

/**
 * Customer cart. Persisted to localStorage so a customer's selections survive
 * a refresh during a single table session. Cleared when an order is placed.
 */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      add: ({ quantity = 1, notes = "", ...item }) => {
        const lines = [...get().lines];
        const idx = lines.findIndex((l) => l.menu_item_id === item.menu_item_id);
        if (idx >= 0) {
          lines[idx] = {
            ...lines[idx],
            quantity: Math.min(99, lines[idx].quantity + quantity),
            notes: notes || lines[idx].notes,
          };
        } else {
          lines.push({ ...item, quantity, notes });
        }
        set({ lines });
      },

      setQuantity: (menu_item_id, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.menu_item_id !== menu_item_id)
              : s.lines.map((l) =>
                  l.menu_item_id === menu_item_id
                    ? { ...l, quantity: Math.min(99, quantity) }
                    : l,
                ),
        })),

      setNotes: (menu_item_id, notes) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.menu_item_id === menu_item_id ? { ...l, notes } : l,
          ),
        })),

      remove: (menu_item_id) =>
        set((s) => ({
          lines: s.lines.filter((l) => l.menu_item_id !== menu_item_id),
        })),

      clear: () => set({ lines: [] }),

      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
      totalCents: () =>
        get().lines.reduce((sum, l) => sum + l.unit_price_cents * l.quantity, 0),
    }),
    {
      name: "qr-cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
