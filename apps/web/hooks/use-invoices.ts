"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { InvoiceData } from "@heard/shared";

interface InvoicesResponse {
  success: boolean;
  data: InvoiceData[];
}

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.all,
    queryFn: () => apiFetch<InvoicesResponse>("/api/invoices"),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      orderId: string;
      subtotal: number;
      tax: number;
      total: number;
      dueDate: string;
      notes?: string;
    }) =>
      apiFetch("/api/invoices", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}
