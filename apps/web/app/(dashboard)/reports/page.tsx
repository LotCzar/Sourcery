"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";
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

const COLORS = ["#22C55E", "#3B82F6", "#F97316", "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B", "#6366F1"];

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
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Shipped", color: "bg-indigo-100 text-indigo-700" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/analytics");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch analytics");
      }
    } catch (err) {
      setError("Failed to fetch analytics");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="text-primary hover:underline"
          >
            Try again
          </button>
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
              onClick={() => window.open("/api/reports/export?type=spending&format=csv", "_blank")}
            >
              <Download className="h-4 w-4 mr-1" />
              Spending CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/api/reports/export?type=orders&format=csv", "_blank")}
            >
              <Download className="h-4 w-4 mr-1" />
              Orders CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/api/reports/export?type=suppliers&format=csv", "_blank")}
            >
              <Download className="h-4 w-4 mr-1" />
              Suppliers CSV
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
                  <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">{weekOverWeekChange.toFixed(1)}%</span>
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

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Spending Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Spending Over Time
            </CardTitle>
            <CardDescription>Daily spending for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.spendOverTime}>
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
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "#22C55E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                      data={data.spendByCategory.map((item) => ({
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
                      {data.spendByCategory.map((_, index) => (
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
                    <Bar dataKey="total" fill="#3B82F6" radius={[0, 4, 4, 0]} />
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
      </div>

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
                data.topProducts.slice(0, 8).map((product, index) => (
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
                data.ordersByStatus.map((item, index) => {
                  const config = statusConfig[item.status] || { label: item.status, color: "bg-gray-100 text-gray-700" };
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
                  data.recentOrders.map((order) => {
                    const config = statusConfig[order.status] || { label: order.status, color: "bg-gray-100 text-gray-700" };
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
    </div>
  );
}
