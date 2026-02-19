import { create } from 'zustand';
import type { CartItem, Product } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, unitPrice: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, qty: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product, unitPrice) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1, unit_price: unitPrice }] };
    }),

  removeItem: (productId) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === productId);
      if (!existing) return state;
      if (existing.quantity <= 1) {
        return { items: state.items.filter((i) => i.product.id !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    }),

  setQuantity: (productId, qty) =>
    set((state) => {
      if (qty <= 0) return { items: state.items.filter((i) => i.product.id !== productId) };
      return {
        items: state.items.map((i) =>
          i.product.id === productId ? { ...i, quantity: qty } : i
        ),
      };
    }),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
}));
