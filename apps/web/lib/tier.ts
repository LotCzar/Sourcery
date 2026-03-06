// Single source of truth for subscription tier gating.
// Works on both server and client — no DB calls.

export type PlanTier = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export const TIER_LEVEL: Record<PlanTier, number> = {
  STARTER: 0,
  PROFESSIONAL: 1,
  ENTERPRISE: 2,
};

export function hasTier(current: PlanTier, required: PlanTier): boolean {
  return TIER_LEVEL[current] >= TIER_LEVEL[required];
}

// ---------------------------------------------------------------------------
// AI Tool Tier Map
// Tools not listed here default to STARTER (available to all).
// ---------------------------------------------------------------------------

export const TOOL_TIER: Record<string, PlanTier> = {
  get_consumption_insights: "PROFESSIONAL",
  optimize_par_levels: "PROFESSIONAL",
  analyze_waste: "PROFESSIONAL",
  get_seasonal_forecast: "PROFESSIONAL",
  get_price_trends: "PROFESSIONAL",
  get_benchmarks: "PROFESSIONAL",
  get_negotiation_brief: "PROFESSIONAL",
  get_budget_forecast: "PROFESSIONAL",
  get_supplier_performance: "PROFESSIONAL",
  export_report: "PROFESSIONAL",
};

export function getToolTier(name: string): PlanTier {
  return TOOL_TIER[name] ?? "STARTER";
}

// ---------------------------------------------------------------------------
// Inngest Background Job Tier Map
// Jobs not listed here default to STARTER (run for all tiers).
// ---------------------------------------------------------------------------

export const JOB_TIER: Record<string, PlanTier> = {
  "proactive-ordering": "PROFESSIONAL",
  "consumption-analysis": "PROFESSIONAL",
  "contract-price-alerts": "PROFESSIONAL",
  "budget-alerts": "PROFESSIONAL",
  "supplier-performance": "PROFESSIONAL",
  "substitution-suggestions": "PROFESSIONAL",
  "delivery-scheduling": "PROFESSIONAL",
  "order-anomaly": "PROFESSIONAL",
};

export function getJobTier(id: string): PlanTier {
  return JOB_TIER[id] ?? "STARTER";
}

// ---------------------------------------------------------------------------
// API Route Tier Requirements
// ---------------------------------------------------------------------------

export const ROUTE_TIER = {
  REPORTS_EXPORT: "PROFESSIONAL" as PlanTier,
  AI_USAGE_ANALYTICS: "PROFESSIONAL" as PlanTier,
  ORG_AI_COSTS: "PROFESSIONAL" as PlanTier,
};

// ---------------------------------------------------------------------------
// Names of Professional-gated tools (for system prompt)
// ---------------------------------------------------------------------------

export const PROFESSIONAL_TOOL_NAMES = Object.entries(TOOL_TIER)
  .filter(([, tier]) => tier === "PROFESSIONAL")
  .map(([name]) => name);

// ---------------------------------------------------------------------------
// Supplier AI Tool Tier Map
// Tools not listed here default to STARTER (available to all).
// ---------------------------------------------------------------------------

export const SUPPLIER_TOOL_TIER: Record<string, PlanTier> = {
  get_demand_forecast: "PROFESSIONAL",
  get_pricing_suggestions: "PROFESSIONAL",
  get_customer_health: "PROFESSIONAL",
  get_supplier_insights: "PROFESSIONAL",
  get_delivery_performance: "PROFESSIONAL",
  get_revenue_summary: "PROFESSIONAL",
  export_supplier_data: "PROFESSIONAL",
};

export function getSupplierToolTier(name: string): PlanTier {
  return SUPPLIER_TOOL_TIER[name] ?? "STARTER";
}

// ---------------------------------------------------------------------------
// Supplier Inngest Background Job Tier Map
// Jobs not listed here default to STARTER (run for all tiers).
// ---------------------------------------------------------------------------

export const SUPPLIER_JOB_TIER: Record<string, PlanTier> = {
  "supplier-demand-forecast": "PROFESSIONAL",
  "supplier-pricing-suggestions": "PROFESSIONAL",
  "supplier-customer-health": "PROFESSIONAL",
  "supplier-churn-warning": "PROFESSIONAL",
  "supplier-revenue-forecast": "PROFESSIONAL",
  "supplier-auto-promotions": "PROFESSIONAL",
  "supplier-quality-trends": "PROFESSIONAL",
  "supplier-delivery-digest": "PROFESSIONAL",
  "supplier-expiration-prevention": "PROFESSIONAL",
  "supplier-seasonal-prep": "PROFESSIONAL",
};

export function getSupplierJobTier(id: string): PlanTier {
  return SUPPLIER_JOB_TIER[id] ?? "STARTER";
}

// ---------------------------------------------------------------------------
// Names of Professional-gated supplier tools (for system prompt)
// ---------------------------------------------------------------------------

export const PROFESSIONAL_SUPPLIER_TOOL_NAMES = Object.entries(SUPPLIER_TOOL_TIER)
  .filter(([, tier]) => tier === "PROFESSIONAL")
  .map(([name]) => name);
