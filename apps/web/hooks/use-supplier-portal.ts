"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useSupplierAnalytics(period?: string) {
  return useQuery({
    queryKey: queryKeys.supplier.analytics(period),
    queryFn: () =>
      apiFetch<any>(`/api/supplier/analytics${period ? `?period=${period}` : ""}`),
  });
}

export function useSupplierCustomers() {
  return useQuery({
    queryKey: queryKeys.supplier.customers,
    queryFn: () => apiFetch<any>("/api/supplier/customers"),
  });
}

export function useBulkPriceUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { productId: string; price?: number; inStock?: boolean }[]) =>
      apiFetch<any>("/api/supplier/products/bulk-update", {
        method: "POST",
        body: JSON.stringify({ updates }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.products.all });
    },
  });
}
