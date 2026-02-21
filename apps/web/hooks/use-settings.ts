"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface UserSettings {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
}

interface RestaurantSettings {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  cuisineType: string | null;
  createdAt: string;
}

interface Preferences {
  emailNotifications: boolean;
  orderUpdates: boolean;
  priceAlerts: boolean;
  weeklyReport: boolean;
}

interface SettingsResponse {
  success: boolean;
  data: {
    user: UserSettings;
    restaurant: RestaurantSettings | null;
    preferences: Preferences;
  };
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => apiFetch<SettingsResponse>("/api/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ section, data }: { section: string; data: Record<string, unknown> }) =>
      apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ section, data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}
