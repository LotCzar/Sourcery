"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierResponse {
  success: boolean;
  data: any;
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => apiFetch<SupplierResponse>(`/api/suppliers/${id}`),
    enabled: !!id,
  });
}
