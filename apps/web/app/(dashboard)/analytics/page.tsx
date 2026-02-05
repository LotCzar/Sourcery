"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
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
  spendBySupplier: Array<{ name: string; total: number; orders: number }>;
  spendByCategory: Array<{ category: string; total: number }>;
  topProducts: Array<{ name: string; total: number; quantity: number }>;
  spendOverTime: Array<{ date: string; total: number; orders: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    supplier: string;
    total: number;
    status: string;
    date: string;
    itemCount: number;
  }>;
}

const COLORS = [
  "#22C55E", // green
  "#3B82F6", // blue
  "#F97316", // orange
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F59E0B", // amber
  "#6366F1", // indigo
];

const categoryColors: Record<string, string> = {
  PRODUCE: "#22C55E",
  MEAT: "#EF4444",
  SEAFOOD: "#3B82F6",
  DAIRY: "#F59E0B",
  DRY_GOODS: "#F97316",
  BAKERY: "#D97706",
  BEVERAGES: "#8B5CF6",
  FROZEN: "#06B6D4",
  OTHER: "#6B7280",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch analytics");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Track your spending and ordering patterns
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const hasOrders = data.overview.totalOrders > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track your spending and ordering patterns
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overview.totalSpend)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
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
            <div className="text-2xl font-bold">
              {formatCurrency(data.overview.avgOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers Used</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.uniqueSuppliers}
            </div>
            <p className="text-xs text-muted-foreground">
              Active suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {hasOrders ? (
        <>
          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Spend Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Spending Over Time</CardTitle>
                <CardDescription>Daily spend for the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.spendOverTime}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
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
                        formatter={(value) => [formatCurrency(value as number), "Spend"]}
                        labelFormatter={(label) => formatFullDate(label)}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#22C55E"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSpend)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Spend by Supplier */}
            <Card>
              <CardHeader>
                <CardTitle>Spend by Supplier</CardTitle>
                <CardDescription>Distribution across suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
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
                        label={({ name, percent }) =>
                          `${(name || "").split(" ")[0]} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {data.spendBySupplier.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Spend by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Spend by Category</CardTitle>
                <CardDescription>Breakdown by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.spendByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `$${value}`}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {data.spendByCategory.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={categoryColors[entry.category] || "#6B7280"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Most purchased items by spend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.quantity} units ordered
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(product.total)}</p>
                      </div>
                    </div>
                  ))}
                  {data.topProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No products ordered yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders & Order Status */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Orders */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Your latest orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFullDate(order.date)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{order.supplier}</TableCell>
                        <TableCell>{order.itemCount}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[order.status] || ""}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.recentOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No orders yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
                <CardDescription>Current order statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.ordersByStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={statusColors[item.status] || ""}
                      >
                        {item.status}
                      </Badge>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                  {data.ordersByStatus.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No orders yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>Spending and order frequency by supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Avg Order</TableHead>
                    <TableHead>Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.spendBySupplier.map((supplier, index) => {
                    const share = data.overview.totalSpend > 0
                      ? (supplier.total / data.overview.totalSpend) * 100
                      : 0;
                    const avgOrder = supplier.orders > 0
                      ? supplier.total / supplier.orders
                      : 0;

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{supplier.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.orders}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(supplier.total)}
                        </TableCell>
                        <TableCell>{formatCurrency(avgOrder)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${share}%`,
                                  backgroundColor: COLORS[index % COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {share.toFixed(1)}%
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
        </>
      ) : (
        <Card className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No data yet</p>
            <p className="mt-1 text-muted-foreground">
              Start creating orders to see your analytics
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
