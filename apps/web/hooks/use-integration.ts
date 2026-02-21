"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface POSIntegrationData {
  id: string;
  provider: string;
  storeId: string | null;
  lastSyncAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface IntegrationResponse {
  success: boolean;
  data: POSIntegrationData | null;
}

interface ConnectResponse {
  success: boolean;
  data: POSIntegrationData | { authUrl: string };
}

export function useIntegration() {
  return useQuery({
    queryKey: queryKeys.integration.pos,
    queryFn: () => apiFetch<IntegrationResponse>("/api/integrations/pos"),
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { provider: string; storeId?: string }) =>
      apiFetch<ConnectResponse>("/api/integrations/pos", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      if (data.data && "authUrl" in data.data) {
        window.location.href = data.data.authUrl;
        return;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.integration.pos });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch("/api/integrations/pos/disconnect", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integration.pos });
    },
  });
}

export function useSyncMenuItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch("/api/integrations/pos/sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integration.pos });
    },
  });
}
