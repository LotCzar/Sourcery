"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { PriceAlertData } from "@freshsheet/shared";

interface PriceAlertsResponse {
  success: boolean;
  data: PriceAlertData[];
}

export function usePriceAlerts() {
  return useQuery({
    queryKey: queryKeys.priceAlerts.all,
    queryFn: () => apiFetch<PriceAlertsResponse>("/api/price-alerts"),
  });
}

export function useCreatePriceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      productId: string;
      alertType: string;
      targetPrice: number;
    }) =>
      apiFetch("/api/price-alerts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.priceAlerts.all });
    },
  });
}

export function useUpdatePriceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
      apiFetch(`/api/price-alerts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.priceAlerts.all });
    },
  });
}

export function useDeletePriceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/price-alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.priceAlerts.all });
    },
  });
}
