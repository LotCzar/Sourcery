"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierOrdersResponse {
  success: boolean;
  data: any[];
}

export function useSupplierOrders(status?: string) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);

  const queryString = params.toString();
  const url = `/api/supplier/orders${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.supplier.orders.all,
    queryFn: () => apiFetch<SupplierOrdersResponse>(url),
  });
}

export function useUpdateSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiFetch(`/api/supplier/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.dashboard });
    },
  });
}
