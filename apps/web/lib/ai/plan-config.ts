import type { PlanTier, AiFeature } from "@prisma/client";

export interface PlanLimits {
  chatOpsPerMonth: number;
  parseOpsPerMonth: number;
  searchOpsPerMonth: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  STARTER: {
    chatOpsPerMonth: 50,
    parseOpsPerMonth: 10,
    searchOpsPerMonth: 200,
  },
  PROFESSIONAL: {
    chatOpsPerMonth: 300,
    parseOpsPerMonth: 50,
    searchOpsPerMonth: 1000,
  },
  ENTERPRISE: {
    chatOpsPerMonth: Infinity,
    parseOpsPerMonth: Infinity,
    searchOpsPerMonth: Infinity,
  },
};

type LimitKey = keyof PlanLimits;

/**
 * Maps each AiFeature to its corresponding limit bucket key.
 * PARSE_MENU and PARSE_RECEIPT share the "parseOpsPerMonth" bucket.
 * WEEKLY_DIGEST is null — system jobs are exempt from rate limiting.
 */
export const FEATURE_TO_LIMIT_KEY: Record<AiFeature, LimitKey | null> = {
  CHAT: "chatOpsPerMonth",
  PARSE_MENU: "parseOpsPerMonth",
  PARSE_RECEIPT: "parseOpsPerMonth",
  SEARCH: "searchOpsPerMonth",
  WEEKLY_DIGEST: null,
  SUPPLIER_CHAT: "chatOpsPerMonth",
  SUPPLIER_DIGEST: null,
};

/**
 * Features that share the same limit bucket.
 * Used to count all features in a group when checking rate limits.
 */
export const FEATURE_GROUPS: Record<LimitKey, AiFeature[]> = {
  chatOpsPerMonth: ["CHAT", "SUPPLIER_CHAT"],
  parseOpsPerMonth: ["PARSE_MENU", "PARSE_RECEIPT"],
  searchOpsPerMonth: ["SEARCH"],
};

/** Returns the 1st of the current UTC month. */
export function getPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Returns the 1st of the next UTC month. */
export function getNextPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
