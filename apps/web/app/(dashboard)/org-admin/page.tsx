"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useOrg } from "@/lib/org-context";
import { useOrgSummary, useOrgRestaurants } from "@/hooks/use-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrgAdminPage() {
  const router = useRouter();
  const { isOrgAdmin, switchRestaurant } = useOrg();
  const { data: summaryData, isLoading: summaryLoading } = useOrgSummary();
  const { data: restaurantsData, isLoading: restaurantsLoading } =
    useOrgRestaurants();

  useEffect(() => {
    if (!isOrgAdmin) {
      router.push("/");
    }
  }, [isOrgAdmin, router]);

  if (!isOrgAdmin) {
    return null;
  }

  const summary = summaryData?.data;
  const restaurants = restaurantsData?.data?.restaurants || [];

  const isLoading = summaryLoading || restaurantsLoading;

  const handleRestaurantClick = (restaurantId: string) => {
    switchRestaurant(restaurantId);
    router.push("/");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Overview</h1>
        <p className="text-muted-foreground">
          Cross-restaurant metrics and management
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend (MTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${summary?.totalSpend?.toLocaleString() || "0"}
                </div>
                {summary?.spendChangePercent !== undefined &&
                  summary.spendChangePercent !== 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {summary.spendChangePercent > 0 ? (
                        <TrendingUp className="h-3 w-3 text-red-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-green-500" />
                      )}
                      {Math.abs(summary.spendChangePercent)}% vs last month
                    </p>
                  )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders (MTD)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">
                {summary?.totalOrders || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-10 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">
                {summary?.totalRestaurants || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-10 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">
                {summary?.totalLowStockAlerts || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Spend by Restaurant Chart */}
      {summary?.restaurantBreakdown && summary.restaurantBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spend by Restaurant (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.restaurantBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString()}`,
                      "Spend",
                    ]}
                  />
                  <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restaurant Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurants</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No restaurants in your organization yet.
            </p>
          ) : (
            <div className="divide-y">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="flex items-center justify-between py-4 cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors"
                  onClick={() => handleRestaurantClick(restaurant.id)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{restaurant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {restaurant.userCount} staff &middot;{" "}
                      {restaurant.orderCount} orders this month
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-medium">
                        ${restaurant.mtdSpend.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">MTD spend</p>
                    </div>
                    {restaurant.lowStockCount > 0 && (
                      <Badge variant="destructive" className="shrink-0">
                        {restaurant.lowStockCount} low stock
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Suppliers */}
      {summary?.topSuppliers && summary.topSuppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topSuppliers.map((supplier, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{supplier.name}</span>
                  <span className="font-medium">
                    ${supplier.spend.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
