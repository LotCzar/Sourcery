"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface InventoryResponse {
  success: boolean;
  data: any[];
  summary: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
}

export function useInventory(filters?: {
  category?: string;
  lowStock?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== "all")
    params.set("category", filters.category);
  if (filters?.lowStock) params.set("lowStock", "true");

  const queryString = params.toString();
  const url = `/api/inventory${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: () => apiFetch<InventoryResponse>(url),
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      category: string;
      unit: string;
      currentQuantity?: number;
      parLevel?: number;
      costPerUnit?: number;
      location?: string;
      notes?: string;
      supplierProductId?: string;
    }) =>
      apiFetch("/api/inventory", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      apiFetch(`/api/inventory/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}
