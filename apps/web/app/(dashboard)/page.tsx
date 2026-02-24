"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Loader2,
  ArrowRight,
  FileText,
  Search,
  Utensils,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  AlertCircle,
  TrendingDown as SavingsIcon,
  BarChart3,
  Plus,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useChat } from "@/lib/chat-context";
import { usePlanTier } from "@/lib/org-context";
import { hasTier } from "@/lib/tier";
import { ProBadge } from "@/components/pro-badge";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { UpcomingDeliveries } from "@/components/dashboard/upcoming-deliveries";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#71717A",
  AWAITING_APPROVAL: "#D97706",
  PENDING: "#D97706",
  CONFIRMED: "#2563EB",
  SHIPPED: "#4F46E5",
  IN_TRANSIT: "#0D9488",
  DELIVERED: "#2F7A5E",
  CANCELLED: "#DC2626",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: "Draft",
    color: "bg-zinc-100 text-zinc-600",
    icon: <FileText className="h-3 w-3" />,
  },
  AWAITING_APPROVAL: {
    label: "Awaiting Approval",
    color: "bg-amber-50 text-amber-700",
    icon: <Clock className="h-3 w-3" />,
  },
  PENDING: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700",
    icon: <Clock className="h-3 w-3" />,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-50 text-blue-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  SHIPPED: {
    label: "Shipped",
    color: "bg-indigo-50 text-indigo-700",
    icon: <Truck className="h-3 w-3" />,
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: "bg-sky-50 text-sky-700",
    icon: <Truck className="h-3 w-3" />,
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-50 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
};

export default function DashboardPage() {
  const { user } = useUser();
  const { openChatWithMessage } = useChat();
  const currentTier = usePlanTier();
  const isPro = hasTier(currentTier, "PROFESSIONAL");
  const { data: result, isLoading, error } = useDashboard();
  const { data: analyticsResult } = useAnalytics("30");

  const spendOverTime: { date: string; total: number }[] =
    analyticsResult?.data?.spendOverTime || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const data = result?.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.firstName || "there"}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            {data.restaurant.name}
            {data.restaurant.cuisineType && (
              <span className="ml-2">
                <Badge variant="outline" className="text-xs">
                  {data.restaurant.cuisineType}
                </Badge>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button asChild>
            <Link href="/menu-parser">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Approvals */}
      <PendingApprovals />

      {/* AI Briefing */}
      {data.briefing?.summary && (
        <Card className="border-border bg-muted" data-tour="ai-briefing">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-primary mb-1">Daily Briefing</p>
                <p className="text-sm text-foreground">{data.briefing.summary}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {data.briefing.lowStockCount > 0 && (
                    <Link href="/inventory">
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                        {data.briefing.lowStockCount} low stock
                      </Badge>
                    </Link>
                  )}
                  {data.briefing.overdueInvoiceCount > 0 && (
                    <Link href="/invoices">
                      <Badge variant="outline" className="cursor-pointer hover:bg-red-50 text-red-700 border-red-200">
                        {data.briefing.overdueInvoiceCount} overdue
                      </Badge>
                    </Link>
                  )}
                  {data.briefing.criticalItems?.length > 0 && (
                    <Link href="/inventory">
                      <Badge variant="outline" className="cursor-pointer hover:bg-amber-50 text-amber-700 border-amber-200">
                        {data.briefing.criticalItems.length} critical
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Assistant Widget */}
      <Card className="bg-card border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold">Ask FreshSheet AI</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              onClick={() => openChatWithMessage("What items should I reorder based on current inventory levels and recent usage patterns?")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              What should I reorder?
            </button>
            <button
              onClick={isPro ? () => openChatWithMessage("Analyze my spending over the last 30 days. Break down by supplier and category, and highlight any trends.") : undefined}
              disabled={!isPro}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${isPro ? "border-primary/20 bg-background/80 hover:bg-background" : "border-muted bg-muted/50 opacity-60 cursor-not-allowed"}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <span className="flex items-center gap-1.5">
                Analyze spending
                {!isPro && <ProBadge />}
              </span>
            </button>
            <button
              onClick={isPro ? () => openChatWithMessage("Find cost savings opportunities by comparing supplier prices for items I frequently order.") : undefined}
              disabled={!isPro}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${isPro ? "border-primary/20 bg-background/80 hover:bg-background" : "border-muted bg-muted/50 opacity-60 cursor-not-allowed"}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <TrendingDown className="h-4 w-4 text-primary" />
              </div>
              <span className="flex items-center gap-1.5">
                Find cost savings
                {!isPro && <ProBadge />}
              </span>
            </button>
            <button
              onClick={() => openChatWithMessage("Check my inventory for items that are low stock or running out soon and need to be reordered.")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <AlertTriangle className="h-4 w-4 text-primary" />
              </div>
              Check low stock items
            </button>
            <button
              onClick={isPro ? () => openChatWithMessage("Compare my suppliers by price, delivery reliability, and product range. Which ones offer the best value?") : undefined}
              disabled={!isPro}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${isPro ? "border-primary/20 bg-background/80 hover:bg-background" : "border-muted bg-muted/50 opacity-60 cursor-not-allowed"}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="flex items-center gap-1.5">
                Compare suppliers
                {!isPro && <ProBadge />}
              </span>
            </button>
            <button
              onClick={isPro ? () => openChatWithMessage("Forecast my budget for next month based on current ordering patterns and historical spending data.") : undefined}
              disabled={!isPro}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${isPro ? "border-primary/20 bg-background/80 hover:bg-background" : "border-muted bg-muted/50 opacity-60 cursor-not-allowed"}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <span className="flex items-center gap-1.5">
                Forecast budget
                {!isPro && <ProBadge />}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deliveries */}
      {data.upcomingDeliveries?.length > 0 && (
        <UpcomingDeliveries deliveries={data.upcomingDeliveries} />
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="quick-actions">
        <Link href="/menu-parser">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Utensils className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Parse Menu</p>
                  <p className="text-sm text-muted-foreground">AI-powered ordering</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/products">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Browse Products</p>
                  <p className="text-sm text-muted-foreground">Compare prices</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/suppliers">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold">Suppliers</p>
                  <p className="text-sm text-muted-foreground">View marketplace</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/orders">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <ShoppingCart className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold">Orders</p>
                  <p className="text-sm text-muted-foreground">
                    {data.stats.pendingOrders} pending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="dashboard-stats">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month&apos;s Spend
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.stats.thisMonthSpend)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {data.stats.spendChange >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-red-600" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-emerald-600" />
              )}
              <span className={data.stats.spendChange >= 0 ? "text-red-600" : "text-emerald-600"}>
                {data.stats.spendChange >= 0 ? "+" : ""}
                {data.stats.spendChange.toFixed(1)}%
              </span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalOrders}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-amber-600 font-medium">
                {data.stats.pendingOrders} pending
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Suppliers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.activeSuppliers}</div>
            <div className="text-xs text-muted-foreground">
              Suppliers with orders
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings Available
            </CardTitle>
            <SavingsIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(
                data.savingsOpportunities.reduce((sum, s) => sum + s.potentialSavings, 0)
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.savingsOpportunities.length} products to compare
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Trend Chart */}
      {spendOverTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Spending Trend
            </CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value}`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    labelFormatter={(label) => {
                      const d = new Date(label);
                      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                    }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#2F7A5E"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "#2F7A5E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest supplier orders</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No orders yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/menu-parser">Create your first order</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href="/orders"
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.supplier} • {order.itemCount} items
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={statusConfig[order.status]?.color || ""}
                      >
                        {statusConfig[order.status]?.icon}
                        <span className="ml-1">
                          {statusConfig[order.status]?.label || order.status}
                        </span>
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings Opportunities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SavingsIcon className="h-5 w-5 text-primary" />
                Savings Opportunities
              </CardTitle>
              <CardDescription>Products available from multiple suppliers</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/products?view=compare">
                Compare all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.savingsOpportunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  No price comparisons available yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.savingsOpportunities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.supplierCount} suppliers • {formatCurrency(item.lowestPrice)} - {formatCurrency(item.highestPrice)}
                      </p>
                    </div>
                    <Badge className="bg-primary/10 text-primary">
                      Save {formatCurrency(item.potentialSavings)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers */}
      {data.topSuppliers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Suppliers</CardTitle>
              <CardDescription>Your most used suppliers this period</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/suppliers">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {data.topSuppliers.map((supplier, idx) => (
                <Link
                  key={supplier.id}
                  href={`/suppliers/${supplier.id}`}
                  className="flex flex-col items-center rounded-lg border p-4 text-center transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {supplier.name.charAt(0)}
                  </div>
                  <p className="mt-2 font-medium truncate w-full">{supplier.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.orderCount} orders
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {formatCurrency(supplier.totalSpend)}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Status Overview */}
      {Object.keys(data.ordersByStatus).length > 0 && (() => {
        const pieData = Object.entries(data.ordersByStatus).map(
          ([status, count]) => ({
            name: statusConfig[status]?.label || status,
            value: count as number,
            status,
          })
        );
        return (
          <Card>
            <CardHeader>
              <CardTitle>Order Status Overview</CardTitle>
              <CardDescription>Distribution of your orders by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.status}
                            fill={STATUS_COLORS[entry.status] || "#9CA3AF"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.ordersByStatus).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center gap-2 rounded-lg border px-4 py-2"
                    >
                      <Badge variant="outline" className={statusConfig[status]?.color || ""}>
                        {statusConfig[status]?.icon}
                        <span className="ml-1">{statusConfig[status]?.label || status}</span>
                      </Badge>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
