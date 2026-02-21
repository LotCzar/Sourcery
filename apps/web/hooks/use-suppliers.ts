"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { SupplierDetail } from "@freshsheet/shared";

interface SupplierResponse {
  success: boolean;
  data: SupplierDetail;
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => apiFetch<SupplierResponse>(`/api/suppliers/${id}`),
    enabled: !!id,
  });
}
