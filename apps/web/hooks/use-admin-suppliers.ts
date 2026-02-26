"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface AdminSupplier {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
}

interface AdminSuppliersResponse {
  success: boolean;
  data: AdminSupplier[];
}

export function useAdminSuppliers(status?: string) {
  const url = status
    ? `/api/admin/suppliers?status=${status}`
    : "/api/admin/suppliers";

  return useQuery({
    queryKey: queryKeys.admin.suppliers(status),
    queryFn: () => apiFetch<AdminSuppliersResponse>(url),
  });
}

export function useVerifySupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { supplierId: string; action: string; notes?: string }) =>
      apiFetch("/api/admin/suppliers", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
    },
  });
}
