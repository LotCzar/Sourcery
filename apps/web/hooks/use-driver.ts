"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface DriverDeliveriesResponse {
  success: boolean;
  data: any[];
}

interface DriverStatsResponse {
  success: boolean;
  data: {
    assignedToday: number;
    completedToday: number;
    activeDelivery: {
      id: string;
      orderNumber: string;
      restaurantName: string;
    } | null;
  };
}

export function useDriverDeliveries() {
  return useQuery({
    queryKey: queryKeys.driver.deliveries,
    queryFn: () => apiFetch<DriverDeliveriesResponse>("/api/driver/deliveries"),
  });
}

export function useDriverDelivery(id: string) {
  return useQuery({
    queryKey: queryKeys.driver.delivery(id),
    queryFn: () => apiFetch<{ success: boolean; data: any }>(`/api/driver/deliveries/${id}`),
    enabled: !!id,
  });
}

export function useDriverStats() {
  return useQuery({
    queryKey: queryKeys.driver.stats,
    queryFn: () => apiFetch<DriverStatsResponse>("/api/driver/stats"),
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      action,
      estimatedDeliveryAt,
      trackingNotes,
    }: {
      id: string;
      action: string;
      estimatedDeliveryAt?: string;
      trackingNotes?: string;
    }) =>
      apiFetch(`/api/driver/deliveries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, estimatedDeliveryAt, trackingNotes }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.driver.deliveries });
      queryClient.invalidateQueries({ queryKey: queryKeys.driver.stats });
    },
  });
}
