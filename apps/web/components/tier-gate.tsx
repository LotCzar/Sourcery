"use client";

import { usePlanTier } from "@/lib/org-context";
import { hasTier, type PlanTier } from "@/lib/tier";
import { UpgradePrompt } from "@/components/upgrade-prompt";

interface TierGateProps {
  requiredTier: PlanTier;
  feature: string;
  description?: string;
  children: React.ReactNode;
}

export function TierGate({
  requiredTier,
  feature,
  description,
  children,
}: TierGateProps) {
  const currentTier = usePlanTier();

  if (hasTier(currentTier, requiredTier)) {
    return <>{children}</>;
  }

  return <UpgradePrompt feature={feature} description={description} />;
}
