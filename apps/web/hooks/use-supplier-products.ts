"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierProductsResponse {
  success: boolean;
  data: any[];
}

export function useSupplierProducts(category?: string) {
  const params = new URLSearchParams();
  if (category && category !== "ALL") params.set("category", category);

  const queryString = params.toString();
  const url = `/api/supplier/products${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.supplier.products.all,
    queryFn: () => apiFetch<SupplierProductsResponse>(url),
  });
}

export function useCreateSupplierProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/supplier/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.dashboard });
    },
  });
}

export function useUpdateSupplierProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: unknown }) =>
      apiFetch(`/api/supplier/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.products.all });
    },
  });
}

export function useDeleteSupplierProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/supplier/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.dashboard });
    },
  });
}
