"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  price: number;
  unit: string;
  inStock: boolean;
  stockQuantity: number | null;
  reorderPoint: number | null;
  expirationDate: string | null;
  updatedAt: string;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  isOutOfStock: boolean;
}

interface InventorySummary {
  totalProducts: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
}

interface InventoryResponse {
  success: boolean;
  data: {
    products: InventoryProduct[];
    summary: InventorySummary;
  };
}

interface StockAdjustment {
  productId: string;
  quantity: number;
  reason?: string;
}

export function useSupplierInventory(filter?: string) {
  return useQuery({
    queryKey: queryKeys.supplier.inventory.filtered(filter),
    queryFn: () =>
      apiFetch<InventoryResponse>(
        `/api/supplier/inventory${filter ? `?filter=${filter}` : ""}`
      ),
  });
}

export function useStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adjustments: StockAdjustment[]) =>
      apiFetch("/api/supplier/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({ adjustments }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.products.all });
    },
  });
}
