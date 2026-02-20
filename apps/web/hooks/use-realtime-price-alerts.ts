"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimePriceAlerts(userId: string | undefined) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.priceAlerts.all });
  }, [queryClient]);

  useRealtime({
    table: "PriceAlert",
    event: "*",
    filter: userId ? `userId=eq.${userId}` : undefined,
    onPayload,
    enabled: !!userId,
  });
}
