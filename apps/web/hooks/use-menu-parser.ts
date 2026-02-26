"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useParseMenu() {
  return useMutation({
    mutationFn: async (data: { menuText?: string; menuType: string; file?: File }) => {
      if (data.file) {
        const formData = new FormData();
        formData.append("file", data.file);
        formData.append("menuType", data.menuType);
        const res = await fetch("/api/ai/parse-menu", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to parse menu");
        }
        return res.json();
      }
      return apiFetch("/api/ai/parse-menu", {
        method: "POST",
        body: JSON.stringify({ menuText: data.menuText, menuType: data.menuType }),
      });
    },
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { items: Array<{ name: string; description?: string; price: number; category?: string; ingredients: Array<{ name: string; quantity: number; unit: string; notes?: string }> }> }) =>
      apiFetch<{ success: boolean; count: number }>("/api/menu-items", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all });
    },
  });
}
