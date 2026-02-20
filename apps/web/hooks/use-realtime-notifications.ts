"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "./use-realtime";

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const onPayload = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);

  useRealtime({
    table: "Notification",
    event: "INSERT",
    filter: userId ? `userId=eq.${userId}` : undefined,
    onPayload,
    enabled: !!userId,
  });
}
