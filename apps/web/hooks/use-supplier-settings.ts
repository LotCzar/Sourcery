"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface SupplierSettingsResponse {
  success: boolean;
  data: any;
}

export function useSupplierSettings() {
  return useQuery({
    queryKey: queryKeys.supplier.settings,
    queryFn: () => apiFetch<SupplierSettingsResponse>("/api/supplier/settings"),
  });
}

export function useUpdateSupplierSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/supplier/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.settings });
    },
  });
}
