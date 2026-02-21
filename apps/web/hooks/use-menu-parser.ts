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
