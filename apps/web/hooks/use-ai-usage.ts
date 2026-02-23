import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";

interface FeatureUsage {
  used: number;
  limit: number;
  remaining: number;
}

interface AiUsageData {
  tier: string;
  periodStart: string;
  resetAt: string;
  features: {
    chat: FeatureUsage;
    parse: FeatureUsage;
    search: FeatureUsage;
  };
}

export function useAiUsage() {
  return useQuery({
    queryKey: queryKeys.aiUsage.all,
    queryFn: () => apiFetch<AiUsageData>("/api/ai/usage"),
    staleTime: 60 * 1000, // 60 seconds
  });
}
