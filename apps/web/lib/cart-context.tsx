"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: CartItem[] };

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.find((item) => item.productId === action.payload.productId);
      if (existing) {
        return state.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      }
      return [...state, action.payload];
    }
    case "REMOVE_ITEM":
      return state.filter((item) => item.productId !== action.payload.productId);
    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return state.filter((item) => item.productId !== action.payload.productId);
      }
      return state.map((item) =>
        item.productId === action.payload.productId
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
    }
    case "CLEAR_CART":
      return [];
    case "HYDRATE":
      return action.payload;
    default:
      return state;
  }
}

const STORAGE_KEY = "heard-cart";

interface CartContextValue {
  cart: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  getQuantity: (productId: string) => number;
  getCartBySupplier: () => Record<string, { supplier: string; items: CartItem[]; total: number }>;
  getCartTotal: () => number;
  itemCount: number;
  clearCart: () => void;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          dispatch({ type: "HYDRATE", payload: parsed });
        }
      }
    } catch {
      // ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  // Sync to localStorage on every change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId } });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } });
  }, []);

  const getQuantity = useCallback(
    (productId: string) => {
      const item = cart.find((i) => i.productId === productId);
      return item?.quantity ?? 0;
    },
    [cart]
  );

  const getCartBySupplier = useCallback(() => {
    const bySupplier: Record<string, { supplier: string; items: CartItem[]; total: number }> = {};
    cart.forEach((item) => {
      if (!bySupplier[item.supplierId]) {
        bySupplier[item.supplierId] = {
          supplier: item.supplierName,
          items: [],
          total: 0,
        };
      }
      bySupplier[item.supplierId].items.push(item);
      bySupplier[item.supplierId].total += item.quantity * item.unitPrice;
    });
    return bySupplier;
  }, [cart]);

  const getCartTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const itemCount = useMemo(() => cart.length, [cart]);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      addItem,
      removeItem,
      updateQuantity,
      getQuantity,
      getCartBySupplier,
      getCartTotal,
      itemCount,
      clearCart,
      isHydrated,
    }),
    [cart, addItem, removeItem, updateQuantity, getQuantity, getCartBySupplier, getCartTotal, itemCount, clearCart, isHydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
