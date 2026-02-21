"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierInvoicesResponse {
  success: boolean;
  data: any[];
  stats: {
    totalOutstanding: number;
    pendingCount: number;
    overdueCount: number;
    paidThisMonth: number;
    paidThisMonthCount: number;
  };
}

export function useSupplierInvoices(status?: string) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);

  const queryString = params.toString();
  const url = `/api/supplier/invoices${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.supplier.invoices.all,
    queryFn: () => apiFetch<SupplierInvoicesResponse>(url),
  });
}

export function useUpdateSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch(`/api/supplier/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.invoices.all });
    },
  });
}
