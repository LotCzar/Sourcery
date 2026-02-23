import type { PlanTier } from "@prisma/client";

interface BillingPlan {
  name: string;
  priceEnvKey: string;
  monthlyPrice: number;
}

export const BILLING_PLANS: Record<PlanTier, BillingPlan> = {
  STARTER: {
    name: "Starter",
    priceEnvKey: "STRIPE_PRICE_STARTER",
    monthlyPrice: 0,
  },
  PROFESSIONAL: {
    name: "Professional",
    priceEnvKey: "STRIPE_PRICE_PROFESSIONAL",
    monthlyPrice: 49,
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceEnvKey: "STRIPE_PRICE_ENTERPRISE",
    monthlyPrice: 199,
  },
};

export function getPriceId(tier: PlanTier): string | undefined {
  return process.env[BILLING_PLANS[tier].priceEnvKey];
}

export function getTierByPriceId(priceId: string): PlanTier | null {
  for (const [tier, plan] of Object.entries(BILLING_PLANS)) {
    if (process.env[plan.priceEnvKey] === priceId) {
      return tier as PlanTier;
    }
  }
  return null;
}
