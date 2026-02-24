"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useParseMenu() {
  return useMutation({
    mutationFn: (data: { menuText: string; menuType: string }) =>
      apiFetch("/api/ai/parse-menu", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}

export function useMatchIngredients() {
  return useMutation({
    mutationFn: (ingredients: unknown[]) =>
      apiFetch("/api/ingredients/match", {
        method: "POST",
        body: JSON.stringify({ ingredients }),
      }),
  });
}

export function useSaveMenuItems() {
  return useMutation({
    mutationFn: (data: { items: Array<{ name: string; description?: string; price: number; category?: string; ingredients: Array<{ name: string; quantity: number; unit: string; notes?: string }> }> }) =>
      apiFetch<{ success: boolean; count: number }>("/api/menu-items", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}
