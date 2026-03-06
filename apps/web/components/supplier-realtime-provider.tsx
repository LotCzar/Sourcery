"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useRealtime } from "@/hooks/use-realtime";

interface UserContext {
  userId: string;
  supplierId: string | null;
}

export function SupplierRealtimeProvider() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["user", "context"],
    queryFn: () => apiFetch<{ data: UserContext }>("/api/user/context"),
    staleTime: 5 * 60 * 1000,
  });

  const userId = data?.data?.userId;
  const supplierId = data?.data?.supplierId ?? undefined;

  const onOrderChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.orders.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.dashboard });
  }, [queryClient]);

  const onInvoiceChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.invoices.all });
  }, [queryClient]);

  const onReturnChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.supplier.returns.all });
  }, [queryClient]);

  const onNotificationChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);

  useRealtime({
    table: "Order",
    event: "*",
    filter: supplierId ? `supplierId=eq.${supplierId}` : undefined,
    onPayload: onOrderChange,
    enabled: !!supplierId,
  });

  useRealtime({
    table: "Invoice",
    event: "*",
    filter: supplierId ? `supplierId=eq.${supplierId}` : undefined,
    onPayload: onInvoiceChange,
    enabled: !!supplierId,
  });

  useRealtime({
    table: "ReturnRequest",
    event: "*",
    onPayload: onReturnChange,
    enabled: !!supplierId,
  });

  useRealtime({
    table: "Notification",
    event: "*",
    filter: userId ? `userId=eq.${userId}` : undefined,
    onPayload: onNotificationChange,
    enabled: !!userId,
  });

  return null;
}
