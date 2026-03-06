"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimeMessages(enabled: boolean) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.unread });
  }, [queryClient]);

  useRealtime({
    table: "OrderMessage",
    event: "INSERT",
    onPayload,
    enabled,
  });
}
