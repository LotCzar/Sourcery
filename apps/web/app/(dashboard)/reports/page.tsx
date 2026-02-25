"use client";

import { useState } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAiUsageAnalytics } from "@/hooks/use-ai-usage-analytics";
import { useConsumptionInsights } from "@/hooks/use-consumption-insights";
import type { ConsumptionInsight } from "@/hooks/use-consumption-insights";
import { usePlanTier } from "@/lib/org-context";
import { hasTier } from "@/lib/tier";
import { ProBadge } from "@/components/pro-badge";
import { TierGate } from "@/components/tier-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Brain,
  ArrowRight,
  Bot,
} from "lucide-react";
import { AiPromptChips } from "@/components/ai-prompt-chips";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface AnalyticsData {
  overview: {
    totalSpend: number;
    totalOrders: number;
    totalItems: number;
    uniqueSuppliers: number;
    avgOrderValue: number;
  };
  spendBySupplier: { name: string; total: number; orders: number }[];
  spendByCategory: { category: string; total: number }[];
  topProducts: { name: string; total: number; quantity: number }[];
  spendOverTime: { date: string; total: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    supplier: string;
    total: number;
    status: string;
    date: string;
    itemCount: number;
  }[];
}

const COLORS = ["#2F7A5E", "#4B7BE5", "#D97706", "#8B5CF6", "#EC4899", "#0D9488", "#F59E0B", "#4F46E5"];

const categoryLabels: Record<string, string> = {
  PRODUCE: "Produce",
  MEAT: "Meat & Poultry",
  SEAFOOD: "Seafood",
  DAIRY: "Dairy",
  BAKERY: "Bakery",
  BEVERAGES: "Beverages",
  DRY_GOODS: "Dry Goods",
  FROZEN: "Frozen",
  OTHER: "Other",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-zinc-100 text-zinc-600" },
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-50 text-blue-700" },
  SHIPPED: { label: "Shipped", color: "bg-indigo-50 text-indigo-700" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-50 text-emerald-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-700" },
};

const FEATURE_COLORS: Record<string, string> = {
  CHAT: "#2F7A5E",
  PARSE_MENU: "#4B7BE5",
  PARSE_RECEIPT: "#D97706",
  SEARCH: "#8B5CF6",
  WEEKLY_DIGEST: "#EC4899",
};

const FEATURE_LABELS: Record<string, string> = {
  CHAT: "Chat",
  PARSE_MENU: "Menu Parsing",
  PARSE_RECEIPT: "Receipt Parsing",
  SEARCH: "Search",
  WEEKLY_DIGEST: "Weekly Digest",
};

const unitLabels: Record<string, string> = {
  POUND: "lb",
  OUNCE: "oz",
  KILOGRAM: "kg",
  GRAM: "g",
  GALLON: "gal",
  LITER: "L",
  QUART: "qt",
  PINT: "pt",
  EACH: "ea",
  CASE: "case",
  DOZEN: "dz",
  BOX: "box",
  BAG: "bag",
  BUNCH: "bunch",
};

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState("30");
  const { data: result, isLoading, error } = useAnalytics(timeRange);
  const data: AnalyticsData | null = result?.data ?? null;
  const currentTier = usePlanTier();
  const canExport = hasTier(currentTier, "PROFESSIONAL");
  const isPro = hasTier(currentTier, "PROFESSIONAL");
  const { data: aiUsageResult } = useAiUsageAnalytics(timeRange);
  const { data: insightsResult } = useConsumptionInsights();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Calculate week-over-week change
  const last7Days = data.spendOverTime.slice(-7);
  const previous7Days = data.spendOverTime.slice(-14, -7);
  const currentWeekSpend = last7Days.reduce((sum, d) => sum + d.total, 0);
  const previousWeekSpend = previous7Days.reduce((sum, d) => sum + d.total, 0);
  const weekOverWeekChange = previousWeekSpend > 0
    ? ((currentWeekSpend - previousWeekSpend) / previousWeekSpend) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Track your spending patterns and optimize your sourcing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport}
              onClick={canExport ? () => window.open(`/api/reports/export?type=spending&format=csv&timeRange=${timeRange}`, "_blank") : undefined}
            >
              <Download className="h-4 w-4 mr-1" />
              Spending CSV
              {!canExport && <ProBadge className="ml-1" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport}
              onClick={canExport ? () => window.open(`/api/reports/export?type=orders&format=csv&timeRange=${timeRange}`, "_blank") : undefined}
            >
              <Download className="h-4 w-4 mr-1" />
              Orders CSV
              {!canExport && <ProBadge className="ml-1" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canExport}
              onClick={canExport ? () => window.open(`/api/reports/export?type=suppliers&format=csv&timeRange=${timeRange}`, "_blank") : undefined}
            >
              <Download className="h-4 w-4 mr-1" />
              Suppliers CSV
              {!canExport && <ProBadge className="ml-1" />}
            </Button>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.totalSpend)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {weekOverWeekChange >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">+{weekOverWeekChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-emerald-600 mr-1" />
                  <span className="text-emerald-600">{weekOverWeekChange.toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.totalItems} items ordered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per order average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.uniqueSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Suppliers you&apos;ve ordered from
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Prompt Chips */}
      <AiPromptChips
        prompts={[
          {
            label: "Analyze spending trends",
            message:
              "Analyze my spending trends over the last few months. Are costs going up or down? What categories are driving the change?",
            icon: <TrendingUp className="h-3.5 w-3.5" />,
            requiredTier: "PROFESSIONAL",
          },
          {
            label: "Best value supplier?",
            message:
              "Which of my suppliers offers the best overall value considering price, reliability, and product range?",
            icon: <Users className="h-3.5 w-3.5" />,
          },
          {
            label: "How to reduce costs?",
            message:
              "What are the most effective ways I can reduce my procurement costs based on my current ordering patterns?",
            icon: <DollarSign className="h-3.5 w-3.5" />,
          },
        ]}
      />

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Spending Over Time
            </CardTitle>
            <CardDescription>Daily spending for the last {timeRange} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.spendOverTime}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F7A5E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2F7A5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), "Spending"]}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#2F7A5E"
                    strokeWidth={2}
                    fill="url(#spendGradient)"
                    activeDot={{ r: 6, fill: "#2F7A5E" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Spending by Category
            </CardTitle>
            <CardDescription>Breakdown of spending across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.spendByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.spendByCategory.map((item: { category: string; total: number }) => ({
                        ...item,
                        name: categoryLabels[item.category] || item.category,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="total"
                      nameKey="name"
                      label={({ name, percent }) => `${name || ""} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {data.spendByCategory.map((_: unknown, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No category data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spending by Supplier */}
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers by Spend</CardTitle>
            <CardDescription>Your most used suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.spendBySupplier.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.spendBySupplier.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="total" fill="#4B7BE5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No supplier data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supplier Share Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Supplier Share
            </CardTitle>
            <CardDescription>Share of total spend by supplier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.spendBySupplier.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.spendBySupplier}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="total"
                      nameKey="name"
                      label={({ name, percent }) => `${name || ""} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {data.spendBySupplier.map((_: unknown, index: number) => (
                        <Cell key={`supplier-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No supplier data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Performance Table */}
      {data.spendBySupplier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance</CardTitle>
            <CardDescription>Detailed breakdown of all supplier activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Avg Order Value</TableHead>
                  <TableHead className="w-[200px]">Market Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.spendBySupplier.map((supplier: { name: string; total: number; orders: number }, index: number) => {
                  const avgOrderValue = supplier.orders > 0 ? supplier.total / supplier.orders : 0;
                  const marketShare = data.overview.totalSpend > 0 ? (supplier.total / data.overview.totalSpend) * 100 : 0;
                  return (
                    <TableRow key={supplier.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{supplier.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{supplier.orders}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(supplier.total)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(avgOrderValue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${marketShare}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {marketShare.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Most purchased items by spend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topProducts.length > 0 ? (
                data.topProducts.slice(0, 8).map((product: { name: string; quantity: number; total: number }, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} units ordered
                        </p>
                      </div>
                    </div>
                    <span className="font-medium">{formatCurrency(product.total)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No product data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Distribution of orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.ordersByStatus.length > 0 ? (
                data.ordersByStatus.map((item: { status: string; count: number }, index: number) => {
                  const config = statusConfig[item.status] || { label: item.status, color: "bg-zinc-100 text-zinc-600" };
                  const percentage = (item.count / data.overview.totalOrders) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {item.count} orders
                          </span>
                        </div>
                        <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No order status data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Your latest orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Order #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Supplier</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.length > 0 ? (
                  data.recentOrders.map((order: { id: string; orderNumber: string; date: string; supplier: string; itemCount: number; total: number; status: string }) => {
                    const config = statusConfig[order.status] || { label: order.status, color: "bg-zinc-100 text-zinc-600" };
                    return (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium">{order.orderNumber}</td>
                        <td className="py-3 px-4">{order.supplier}</td>
                        <td className="py-3 px-4">{order.itemCount} items</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(order.total)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No recent orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {/* AI Usage Analytics — Pro-gated */}
      <TierGate
        requiredTier="PROFESSIONAL"
        feature="AI Usage Analytics"
        description="Track AI usage across your team, including per-user costs and feature breakdowns. Upgrade to Professional to unlock."
      >
        {aiUsageResult?.data && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Usage Analytics
              </h2>
              <p className="text-sm text-muted-foreground">
                AI usage breakdown for the last {timeRange} days
              </p>
            </div>

            {/* AI Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total AI Requests</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{aiUsageResult.data.totalRequests}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated AI Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(aiUsageResult.data.totalCost)}</div>
                </CardContent>
              </Card>
            </div>

            {/* AI Usage Over Time — Stacked Bar Chart */}
            {aiUsageResult.data.timeSeries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Usage by Feature</CardTitle>
                  <CardDescription>Daily AI operations by feature type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aiUsageResult.data.timeSeries}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend
                          formatter={(value: string) => FEATURE_LABELS[value] || value}
                        />
                        {Object.keys(FEATURE_COLORS).map((feature) => (
                          <Bar
                            key={feature}
                            dataKey={feature}
                            stackId="ai"
                            fill={FEATURE_COLORS[feature]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-User AI Usage Table */}
            {aiUsageResult.data.perUser.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Usage by Team Member</CardTitle>
                  <CardDescription>Individual team member AI consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiUsageResult.data.perUser.map((user: { userId: string; name: string; requestCount: number; totalCost: number }) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-right">{user.requestCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(user.totalCost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </TierGate>

      {/* Inventory Insights — Pro-gated */}
      <TierGate
        requiredTier="PROFESSIONAL"
        feature="Inventory Insights"
        description="Get AI-powered consumption forecasting, stockout predictions, and par level recommendations. Upgrade to Professional to unlock."
      >
        {insightsResult?.data && insightsResult.data.length > 0 && (
          <Card className="border-indigo-200 bg-indigo-50/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-700" />
                <CardTitle className="text-lg">Inventory Insights</CardTitle>
              </div>
              <CardDescription>
                Based on {insightsResult.summary.totalInsights} items analyzed
                {insightsResult.summary.criticalItemCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {insightsResult.summary.criticalItemCount} critical
                  </Badge>
                )}
                {insightsResult.summary.parMismatchCount > 0 && (
                  <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700">
                    {insightsResult.summary.parMismatchCount} par adjustments
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Critical items - low runway */}
                {insightsResult.data
                  .filter(
                    (i: ConsumptionInsight) =>
                      i.daysUntilStockout !== null && i.daysUntilStockout < 3
                  )
                  .slice(0, 5)
                  .map((insight: ConsumptionInsight) => (
                    <div
                      key={insight.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive" className="text-xs">
                          {insight.daysUntilStockout !== null
                            ? `${Math.round(insight.daysUntilStockout * 10) / 10}d left`
                            : "Low"}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{insight.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            Using ~{insight.avgDailyUsage.toFixed(1)}/{unitLabels[insight.unit] || insight.unit.toLowerCase()}/day
                            {insight.trendDirection === "UP" && " (trending up)"}
                            {insight.trendDirection === "DOWN" && " (trending down)"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">
                        {insight.currentQuantity.toFixed(1)} {unitLabels[insight.unit] || insight.unit.toLowerCase()} left
                      </p>
                    </div>
                  ))}

                {/* Par level suggestions */}
                {insightsResult.data
                  .filter(
                    (i: ConsumptionInsight) =>
                      i.suggestedParLevel !== null &&
                      i.currentParLevel !== null &&
                      Math.abs(i.suggestedParLevel - i.currentParLevel) >
                        i.currentParLevel * 0.2
                  )
                  .slice(0, 5)
                  .map((insight: ConsumptionInsight) => (
                    <div
                      key={`par-${insight.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                          Par
                        </Badge>
                        <p className="font-medium text-sm">{insight.itemName}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {insight.currentParLevel?.toFixed(1)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-amber-700">
                          {insight.suggestedParLevel?.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {unitLabels[insight.unit] || insight.unit.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TierGate>
    </div>
  );
}
