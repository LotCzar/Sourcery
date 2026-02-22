"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/hooks/use-toast";
import { useRealtime } from "./use-realtime";

const notificationVariantMap: Record<string, "default" | "destructive" | "success" | "warning"> = {
  PRICE_ALERT: "destructive",
  DELIVERY_UPDATE: "default",
  ORDER_UPDATE: "success",
  SYSTEM: "warning",
  PROMOTION: "default",
};

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const onPayload = useCallback((payload: { new: { type?: string; title?: string; message?: string } }) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

    const notification = payload.new;
    const variant = notificationVariantMap[notification.type ?? ""] ?? "default";

    toast({
      title: notification.title ?? "New notification",
      description: notification.message,
      variant,
    });
  }, [queryClient]);

  useRealtime({
    table: "Notification",
    event: "INSERT",
    filter: userId ? `userId=eq.${userId}` : undefined,
    onPayload,
    enabled: !!userId,
  });
}
