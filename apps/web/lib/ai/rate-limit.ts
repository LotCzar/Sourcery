import type { AiFeature, PlanTier } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  PLAN_LIMITS,
  FEATURE_TO_LIMIT_KEY,
  FEATURE_GROUPS,
  getPeriodStart,
  getNextPeriodStart,
} from "./plan-config";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date;
  feature: AiFeature;
  tier: PlanTier;
}

/**
 * Checks whether a restaurant can make another AI call for the given feature.
 *
 * - Enterprise tier: always allowed (no DB query)
 * - WEEKLY_DIGEST: always allowed (system exempt)
 * - PARSE_MENU + PARSE_RECEIPT share the "parse" bucket
 */
export async function checkAiRateLimit(
  restaurantId: string,
  feature: AiFeature,
  planTier: PlanTier
): Promise<RateLimitResult> {
  const resetAt = getNextPeriodStart();

  // WEEKLY_DIGEST is system-exempt
  if (feature === "WEEKLY_DIGEST") {
    return {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      resetAt,
      feature,
      tier: planTier,
    };
  }

  const limitKey = FEATURE_TO_LIMIT_KEY[feature];
  if (!limitKey) {
    return {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      resetAt,
      feature,
      tier: planTier,
    };
  }

  const limit = PLAN_LIMITS[planTier][limitKey];

  // Enterprise: unlimited, skip DB query
  if (!isFinite(limit)) {
    return {
      allowed: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      resetAt,
      feature,
      tier: planTier,
    };
  }

  const features = FEATURE_GROUPS[limitKey];
  const periodStart = getPeriodStart();

  const used = await prisma.aiUsageLog.count({
    where: {
      restaurantId,
      feature: { in: features },
      periodStart,
    },
  });

  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
    resetAt,
    feature,
    tier: planTier,
  };
}
