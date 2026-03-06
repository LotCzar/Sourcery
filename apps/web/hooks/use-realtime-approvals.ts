"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimeApprovals(enabled: boolean) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.pending });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  }, [queryClient]);

  useRealtime({
    table: "OrderApproval",
    event: "*",
    onPayload,
    enabled,
  });
}
