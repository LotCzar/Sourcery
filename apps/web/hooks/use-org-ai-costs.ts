import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface FeatureCost {
  feature: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCost: number;
}

interface RestaurantCost {
  id: string;
  name: string;
  planTier: string;
  totalEstimatedCost: number;
  features: FeatureCost[];
}

interface OrgAiCostsData {
  success: boolean;
  data: {
    period: { from: string; to: string };
    totalEstimatedCost: number;
    restaurants: RestaurantCost[];
  };
}

export function useOrgAiCosts(params?: { from?: string; to?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.from) searchParams.set("from", params.from);
  if (params?.to) searchParams.set("to", params.to);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: queryKeys.org.aiCosts(params),
    queryFn: () =>
      apiFetch<OrgAiCostsData>(`/api/org/ai-costs${qs ? `?${qs}` : ""}`),
    staleTime: 5 * 60 * 1000,
  });
}
