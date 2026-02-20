"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimeOrders(restaurantId: string | undefined) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  }, [queryClient]);

  useRealtime({
    table: "Order",
    event: "*",
    filter: restaurantId ? `restaurantId=eq.${restaurantId}` : undefined,
    onPayload,
    enabled: !!restaurantId,
  });
}
