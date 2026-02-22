"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useOrderMessages(orderId: string) {
  return useQuery({
    queryKey: queryKeys.messages.byOrder(orderId),
    queryFn: () => apiFetch<any>(`/api/orders/${orderId}/messages`),
    enabled: !!orderId,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.messages.unread,
    queryFn: () => apiFetch<any>("/api/messages/unread"),
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useSendMessage(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; isInternal?: boolean }) =>
      apiFetch<any>(`/api/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.byOrder(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unread });
    },
  });
}
