"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface Driver {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  deliveryCount: number;
  createdAt: string;
}

interface DriversResponse {
  success: boolean;
  data: Driver[];
}

export function useSupplierDrivers() {
  return useQuery({
    queryKey: queryKeys.supplier.drivers,
    queryFn: () => apiFetch<DriversResponse>("/api/supplier/drivers"),
  });
}

export function useAddDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName?: string;
      email: string;
      phone?: string;
    }) =>
      apiFetch("/api/supplier/drivers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.drivers });
    },
  });
}

export function useRemoveDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/supplier/drivers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.drivers });
    },
  });
}
