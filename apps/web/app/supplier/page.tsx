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
  DollarSign,
  ShoppingCart,
  Package,
  Loader2,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  AlertCircle,
  Plus,
  BarChart3,
  Users,
  Sparkles,
  Tag,
} from "lucide-react";
import { useSupplierDashboard } from "@/hooks/use-supplier-dashboard";
import { useSupplierChat } from "@/lib/supplier-chat-context";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-zinc-100 text-zinc-600",
    icon: <FileText className="h-3 w-3" />,
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

const supplierStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending Verification", color: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", color: "bg-emerald-50 text-emerald-700" },
  SUSPENDED: { label: "Suspended", color: "bg-red-50 text-red-700" },
  INACTIVE: { label: "Inactive", color: "bg-zinc-100 text-zinc-600" },
};

export default function SupplierDashboardPage() {
  const { user } = useUser();
  const { data: result, isLoading, error } = useSupplierDashboard();
  const { openChatWithMessage } = useSupplierChat();

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
          <p className="mt-1 text-muted-foreground flex items-center gap-2">
            {data.supplier.name}
            <Badge
              variant="outline"
              className={supplierStatusConfig[data.supplier.status]?.color || ""}
            >
              {supplierStatusConfig[data.supplier.status]?.label ||
                data.supplier.status}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/supplier/orders">
              <ShoppingCart className="mr-2 h-4 w-4" />
              View Orders
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/supplier/products?mode=bulk">
              <BarChart3 className="mr-2 h-4 w-4" />
              Bulk Update
            </Link>
          </Button>
          <Button asChild>
            <Link href="/supplier/products">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending Verification Banner */}
      {data.supplier.status === "PENDING" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700" />
            <div>
              <p className="font-medium text-amber-800">
                Account Pending Verification
              </p>
              <p className="text-sm text-amber-700">
                Your supplier account is being reviewed. You can add products while
                we verify your business details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                  {data.briefing.pendingOrderCount > 0 && (
                    <Link href="/supplier/orders?status=PENDING">
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                        {data.briefing.pendingOrderCount} pending orders
                      </Badge>
                    </Link>
                  )}
                  {data.briefing.overdueInvoiceCount > 0 && (
                    <Link href="/supplier/invoices">
                      <Badge variant="outline" className="cursor-pointer hover:bg-red-50 text-red-700 border-red-200">
                        {data.briefing.overdueInvoiceCount} overdue invoices
                      </Badge>
                    </Link>
                  )}
                  {data.briefing.outOfStockCount > 0 && (
                    <Link href="/supplier/products">
                      <Badge variant="outline" className="cursor-pointer hover:bg-amber-50 text-amber-700 border-amber-200">
                        {data.briefing.outOfStockCount} out of stock
                      </Badge>
                    </Link>
                  )}
                  {data.briefing.atRiskCustomerCount > 0 && (
                    <Link href="/supplier/customers">
                      <Badge variant="outline" className="cursor-pointer hover:bg-orange-50 text-orange-700 border-orange-200">
                        {data.briefing.atRiskCustomerCount} at-risk customers
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="supplier-quick-actions">
        <Link href="/supplier/orders?status=PENDING">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="font-semibold">Pending Orders</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {data.stats.pendingOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/supplier/orders?status=CONFIRMED">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <CheckCircle className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <p className="font-semibold">To Ship</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {data.stats.confirmedOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/supplier/orders?status=SHIPPED">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50">
                  <Truck className="h-6 w-6 text-indigo-700" />
                </div>
                <div>
                  <p className="font-semibold">In Transit</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {data.stats.shippedOrders}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/supplier/products">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                  <Package className="h-6 w-6 text-emerald-700" />
                </div>
                <div>
                  <p className="font-semibold">Products</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {data.stats.totalProducts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

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
              onClick={() => openChatWithMessage("Show me all pending orders that need my attention and suggest which to prioritize")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              Check pending orders
            </button>
            <button
              onClick={() => openChatWithMessage("Give me a revenue summary for this month compared to last month, broken down by customer")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              Revenue summary
            </button>
            <button
              onClick={() => openChatWithMessage("Which customers are at risk of churning? Show me their health scores and suggest follow-up actions")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Customer insights
            </button>
            <button
              onClick={() => openChatWithMessage("What pricing adjustments should I consider based on order volume trends and market demand?")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              Pricing suggestions
            </button>
            <button
              onClick={() => openChatWithMessage("What's the demand forecast for my products this week? Flag any items I should stock up on")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              Demand forecast
            </button>
            <button
              onClick={() => openChatWithMessage("Which invoices are overdue? Show me the escalation status and recommended next steps")}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2.5 text-sm text-left transition-colors hover:bg-background"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Overdue invoices
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-tour="supplier-dashboard-stats">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From delivered orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered This Month
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.deliveredOrdersThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Orders successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products in your catalog
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders from restaurants</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/supplier/orders">
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
                <p className="text-sm text-muted-foreground">
                  Orders will appear here when restaurants place them
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order: any) => (
                  <Link
                    key={order.id}
                    href="/supplier/orders"
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.restaurant.name}
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
                        <p className="font-semibold">
                          {formatCurrency(order.total)}
                        </p>
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

        {/* Top Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Your best-selling products</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/supplier/products">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  No products ordered yet
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/supplier/products">Add your first product</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.category} • {product.orderCount} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">
                        {formatCurrency(product.totalRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @ {formatCurrency(product.price || 0)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
