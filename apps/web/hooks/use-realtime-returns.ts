"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimeReturns(enabled: boolean) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
  }, [queryClient]);

  useRealtime({
    table: "ReturnRequest",
    event: "*",
    onPayload,
    enabled,
  });
}
