"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  Building,
  MapPin,
  Truck,
  Save,
  HelpCircle,
  RotateCcw,
  DollarSign,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useSupplierSettings, useUpdateSupplierSettings } from "@/hooks/use-supplier-settings";
import { useSupplierAiUsage, useSupplierAiUsageAnalytics } from "@/hooks/use-supplier-ai-usage";
import { useSupplierBillingCheckout, useSupplierBillingPortal } from "@/hooks/use-supplier-billing";
import { useUpdateSupplierPlan } from "@/hooks/use-update-supplier-plan";
import { useTour } from "@/lib/tour-context";
import { hasTier } from "@/lib/tier";

const supplierStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending Verification", color: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", color: "bg-emerald-50 text-emerald-700" },
  SUSPENDED: { label: "Suspended", color: "bg-red-50 text-red-700" },
  INACTIVE: { label: "Inactive", color: "bg-zinc-100 text-zinc-600" },
};

export default function SupplierSettingsPage() {
  const { toast } = useToast();
  const { data: result, isLoading, error } = useSupplierSettings();
  const updateSettings = useUpdateSupplierSettings();

  const settings = result?.data;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    website: "",
    minimumOrder: "",
    deliveryFee: "",
    leadTimeDays: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || "",
        description: settings.description || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        city: settings.city || "",
        state: settings.state || "",
        zipCode: settings.zipCode || "",
        website: settings.website || "",
        minimumOrder: settings.minimumOrder?.toString() || "",
        deliveryFee: settings.deliveryFee?.toString() || "",
        leadTimeDays: settings.leadTimeDays?.toString() || "1",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    updateSettings.mutate(formData, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully!" });
      },
      onError: (err) => {
        toast({ title: "Failed to save settings", description: err.message, variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-600">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your supplier profile and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={supplierStatusConfig[settings.status]?.color || ""}
          >
            {supplierStatusConfig[settings.status]?.label || settings.status}
          </Badge>
          {settings.rating !== null && (
            <Badge variant="outline">
              {settings.rating.toFixed(1)} ({settings.reviewCount} reviews)
            </Badge>
          )}
        </div>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            Your company details visible to restaurants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of your business..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://..."
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address
          </CardTitle>
          <CardDescription>
            Your business location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Settings
          </CardTitle>
          <CardDescription>
            Configure your ordering and delivery preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
              <Input
                id="minimumOrder"
                type="number"
                placeholder="No minimum"
                value={formData.minimumOrder}
                onChange={(e) =>
                  setFormData({ ...formData, minimumOrder: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
              <Input
                id="deliveryFee"
                type="number"
                placeholder="0"
                value={formData.deliveryFee}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryFee: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="1"
                value={formData.leadTimeDays}
                onChange={(e) =>
                  setFormData({ ...formData, leadTimeDays: e.target.value })
                }
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Lead time is the number of days in advance that orders must be placed.
          </p>
        </CardContent>
      </Card>

      {/* Plan & Usage */}
      <PlanAndUsageSection planTier={settings.planTier} stripeSubscriptionId={settings.stripeSubscriptionId} />

      {/* Guided Tour */}
      <GuidedTourCard />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function PlanAndUsageSection({
  planTier,
  stripeSubscriptionId,
}: {
  planTier: string;
  stripeSubscriptionId: string | null;
}) {
  const { toast } = useToast();
  const { data: usageData, isLoading, isError } = useSupplierAiUsage();
  const billingCheckout = useSupplierBillingCheckout();
  const billingPortal = useSupplierBillingPortal();
  const updatePlan = useUpdateSupplierPlan();

  const usage = usageData?.data?.features;
  const hasSubscription = !!stripeSubscriptionId;

  const getBarColor = (used: number, limit: number) => {
    if (!isFinite(limit) || limit === 0) return "bg-emerald-600";
    const pct = (used / limit) * 100;
    if (pct >= 90) return "bg-red-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-emerald-600";
  };

  const handleBillingCheckout = (tier: string) => {
    billingCheckout.mutate(tier, {
      onError: (err) => {
        toast({
          title: "Failed to start checkout",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      },
    });
  };

  const handleBillingPortal = () => {
    billingPortal.mutate(undefined, {
      onError: (err) => {
        toast({
          title: "Failed to open billing portal",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      },
    });
  };

  const handlePlanChange = (tier: string) => {
    updatePlan.mutate(tier, {
      onSuccess: () => {
        toast({ title: `Plan updated to ${tier.charAt(0) + tier.slice(1).toLowerCase()}` });
      },
      onError: (err) => {
        toast({
          title: "Failed to update plan",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !usageData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Unable to load usage data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Manage your subscription tier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">Plan:</span>
            <Badge
              variant={usageData.data.tier === "ENTERPRISE" ? "default" : "outline"}
              className="text-sm"
            >
              {usageData.data.tier}
            </Badge>
          </div>

          {hasSubscription ? (
            <Button
              variant="outline"
              onClick={handleBillingPortal}
              disabled={billingPortal.isPending}
            >
              {billingPortal.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <DollarSign className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upgrade your plan via Stripe billing:
              </p>
              <div className="flex gap-2">
                {([
                  { tier: "PROFESSIONAL", label: "Professional - $49/mo" },
                  { tier: "ENTERPRISE", label: "Enterprise - $199/mo" },
                ] as const).map(({ tier, label }) => (
                  <Button
                    key={tier}
                    variant={usageData.data.tier === tier ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleBillingCheckout(tier)}
                    disabled={billingCheckout.isPending || usageData.data.tier === tier}
                  >
                    {billingCheckout.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {label}
                  </Button>
                ))}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Or change plan directly (no billing):</Label>
                <Select
                  value={usageData.data.tier}
                  onValueChange={handlePlanChange}
                  disabled={updatePlan.isPending}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">Starter (Free)</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Resets on {new Date(usageData.data.resetAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>AI Usage This Month</CardTitle>
            <CardDescription>Track your AI feature consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                { key: "chat" as const, label: "Chat" },
                { key: "parse" as const, label: "Parse" },
                { key: "search" as const, label: "Search" },
              ]).map(({ key, label }) => {
                const feature = usage[key];
                const isUnlimited = !isFinite(feature.limit);
                const pct = isUnlimited
                  ? 0
                  : Math.min((feature.used / feature.limit) * 100, 100);
                return (
                  <div key={key} className="space-y-2 rounded-lg border p-4">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-2xl font-bold">
                      {feature.used}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        / {isUnlimited ? "\u221e" : feature.limit} used
                      </span>
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${getBarColor(feature.used, feature.limit)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isUnlimited ? "Unlimited" : `${feature.remaining} remaining`}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {hasTier(planTier as any, "PROFESSIONAL") && (
        <SupplierUsageAnalyticsCharts />
      )}
    </>
  );
}

const SUPPLIER_FEATURE_COLORS: Record<string, string> = {
  SUPPLIER_CHAT: "#4B7BE5",
  SUPPLIER_DIGEST: "#8B5CF6",
};

const SUPPLIER_FEATURE_LABELS: Record<string, string> = {
  SUPPLIER_CHAT: "Chat",
  SUPPLIER_DIGEST: "Digest",
};

const USER_COLORS = [
  "#4B7BE5",
  "#2F7A5E",
  "#D97706",
  "#8B5CF6",
  "#EC4899",
  "#0D9488",
  "#F59E0B",
  "#4F46E5",
];

function SupplierUsageAnalyticsCharts() {
  const [analyticsRange, setAnalyticsRange] = useState("30");
  const { data: analyticsResult, isLoading } =
    useSupplierAiUsageAnalytics(analyticsRange);
  const analytics = analyticsResult?.data;

  const formatDate = (value: string | number) => {
    const str = String(value);
    return new Date(str + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  const formatCost = (value: number) => `$${value.toFixed(4)}`;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Usage Analytics</CardTitle>
            <CardDescription>Trends and team breakdown</CardDescription>
          </div>
          <Select value={analyticsRange} onValueChange={setAnalyticsRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">
              {analytics.totalRequests.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Estimated Cost</p>
            <p className="text-2xl font-bold">{formatCost(analytics.totalCost)}</p>
          </div>
        </div>

        {/* Stacked Area Chart */}
        <div>
          <h4 className="mb-4 text-sm font-medium">
            Daily AI Operations by Feature
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.timeSeries}>
                <defs>
                  {Object.entries(SUPPLIER_FEATURE_COLORS).map(
                    ([key, color]) => (
                      <linearGradient
                        key={key}
                        id={`gradient-supplier-${key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop
                          offset="95%"
                          stopColor={color}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    )
                  )}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(label) => formatDate(label)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                {Object.entries(SUPPLIER_FEATURE_COLORS).map(([key, color]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={SUPPLIER_FEATURE_LABELS[key]}
                    stackId="1"
                    stroke={color}
                    fill={`url(#gradient-supplier-${key})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Trend Chart */}
        <div>
          <h4 className="mb-4 text-sm font-medium">Daily Cost Trend</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.timeSeries}>
                <defs>
                  <linearGradient
                    id="gradient-supplier-cost"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#2F7A5E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2F7A5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip
                  labelFormatter={(label) => formatDate(label)}
                  formatter={(value) => [formatCost(value as number), "Cost"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalCost"
                  name="Cost"
                  stroke="#2F7A5E"
                  fill="url(#gradient-supplier-cost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-User Bar Chart */}
        {analytics.perUser.length > 0 && (
          <div>
            <h4 className="mb-4 text-sm font-medium">Usage by Team Member</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.perUser}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    width={75}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "requestCount") return [value, "Requests"];
                      return [formatCost(value as number), "Cost"];
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="requestCount"
                    name="requestCount"
                    radius={[0, 4, 4, 0]}
                  >
                    {analytics.perUser.map((_, index) => (
                      <Cell
                        key={index}
                        fill={USER_COLORS[index % USER_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GuidedTourCard() {
  const { resetTour } = useTour();
  const router = useRouter();

  const handleRestart = () => {
    resetTour();
    router.push("/supplier");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Guided Tour
        </CardTitle>
        <CardDescription>
          Take a guided tour of the Supplier Portal features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Restart Tour</p>
            <p className="text-sm text-muted-foreground">
              Walk through all the key features again
            </p>
          </div>
          <Button variant="outline" onClick={handleRestart}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
