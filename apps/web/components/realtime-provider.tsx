"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useRealtimePriceAlerts } from "@/hooks/use-realtime-price-alerts";
import { useRealtimeInventory } from "@/hooks/use-realtime-inventory";

interface UserContext {
  userId: string;
  restaurantId: string | null;
}

export function RealtimeProvider() {
  const { data } = useQuery({
    queryKey: ["user", "context"],
    queryFn: () => apiFetch<{ data: UserContext }>("/api/user/context"),
    staleTime: 5 * 60 * 1000,
  });

  const userId = data?.data?.userId;
  const restaurantId = data?.data?.restaurantId ?? undefined;

  useRealtimeOrders(restaurantId);
  useRealtimeNotifications(userId);
  useRealtimePriceAlerts(userId);
  useRealtimeInventory(restaurantId);

  return null;
}
