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

export function useSupplierCustomers(search?: string) {
  return useQuery({
    queryKey: queryKeys.supplier.customers(search),
    queryFn: () =>
      apiFetch<any>(`/api/supplier/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });
}

export function useDeliveryZones() {
  return useQuery({
    queryKey: queryKeys.supplier.deliveryZones,
    queryFn: () => apiFetch<any>("/api/supplier/delivery-zones"),
  });
}

export function useCreateDeliveryZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; zipCodes: string[]; deliveryFee: number; minimumOrder?: number }) =>
      apiFetch<any>("/api/supplier/delivery-zones", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.deliveryZones });
    },
  });
}

export function useUpdateDeliveryZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; zipCodes?: string[]; deliveryFee?: number; minimumOrder?: number | null }) =>
      apiFetch<any>(`/api/supplier/delivery-zones/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.deliveryZones });
    },
  });
}

export function useDeleteDeliveryZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<any>(`/api/supplier/delivery-zones/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.deliveryZones });
    },
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
