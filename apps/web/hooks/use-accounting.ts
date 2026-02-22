"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useAccountingIntegration() {
  return useQuery({
    queryKey: queryKeys.accounting.integration,
    queryFn: () => apiFetch<any>("/api/accounting/integration"),
  });
}

export function useAccountingMappings() {
  return useQuery({
    queryKey: queryKeys.accounting.mappings,
    queryFn: () => apiFetch<any>("/api/accounting/mappings"),
  });
}

export function useSyncInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { invoiceIds?: string[] }) =>
      apiFetch<any>("/api/accounting/sync", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.integration });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

export function useUpdateMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappings: { productCategory: string; accountingCode: string; accountingName?: string }[]) =>
      apiFetch<any>("/api/accounting/mappings", {
        method: "PUT",
        body: JSON.stringify({ mappings }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.mappings });
    },
  });
}
