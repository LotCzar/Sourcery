"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimeInvoices(restaurantId: string | undefined) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
  }, [queryClient]);

  useRealtime({
    table: "Invoice",
    event: "*",
    filter: restaurantId ? `restaurantId=eq.${restaurantId}` : undefined,
    onPayload,
    enabled: !!restaurantId,
  });
}
