"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimeInventory(restaurantId: string | undefined) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
  }, [queryClient]);

  useRealtime({
    table: "InventoryItem",
    event: "*",
    filter: restaurantId ? `restaurantId=eq.${restaurantId}` : undefined,
    onPayload,
    enabled: !!restaurantId,
  });
}
