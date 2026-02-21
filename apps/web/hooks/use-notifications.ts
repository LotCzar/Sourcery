"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
import type { NotificationData } from "@freshsheet/shared";

interface NotificationsResponse {
  success: boolean;
  data: NotificationData[];
  unreadCount: number;
}

export function useNotifications(unreadOnly?: boolean) {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unreadOnly", "true");
  const queryString = params.toString();
  const url = `/api/notifications${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.notifications.filtered(!!unreadOnly),
    queryFn: () => apiFetch<NotificationsResponse>(url),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isRead: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch("/api/notifications", {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
