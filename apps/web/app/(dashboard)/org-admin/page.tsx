"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
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
import { useOrgSummary, useOrgRestaurants, useAddOrgRestaurant } from "@/hooks/use-org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const cuisineTypes = [
  "American", "Italian", "Mexican", "Chinese", "Japanese", "Thai",
  "Indian", "French", "Mediterranean", "Vietnamese", "Korean", "Greek",
  "Spanish", "Middle Eastern", "Caribbean", "Soul Food", "Seafood",
  "Steakhouse", "Pizza", "Burger", "Café", "Bakery", "Other",
];

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function OrgAdminPage() {
  const router = useRouter();
  const { isOrgAdmin, switchRestaurant } = useOrg();
  const { data: summaryData, isLoading: summaryLoading } = useOrgSummary();
  const { data: restaurantsData, isLoading: restaurantsLoading } =
    useOrgRestaurants();
  const [showAddDialog, setShowAddDialog] = useState(false);

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
                        <TrendingDown className="h-3 w-3 text-emerald-600" />
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Restaurants</CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
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

      {/* Add Restaurant Dialog */}
      <AddRestaurantDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}

function AddRestaurantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addRestaurant = useAddOrgRestaurant();
  const { toast } = useToast();
  const [form, setForm] = useState({
    restaurantName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    cuisineType: "",
    seatingCapacity: "",
  });

  const handleSubmit = async () => {
    try {
      await addRestaurant.mutateAsync({
        restaurantName: form.restaurantName,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        cuisineType: form.cuisineType || undefined,
        seatingCapacity: form.seatingCapacity || undefined,
      });
      onOpenChange(false);
      setForm({
        restaurantName: "", address: "", city: "", state: "", zipCode: "",
        phone: "", email: "", website: "", cuisineType: "", seatingCapacity: "",
      });
      toast({ title: "Restaurant added successfully" });
    } catch (err: any) {
      toast({
        title: "Failed to add restaurant",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Restaurant</DialogTitle>
          <DialogDescription>
            Add a new restaurant to your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newRestaurantName">Restaurant Name *</Label>
            <Input
              id="newRestaurantName"
              value={form.restaurantName}
              onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
              placeholder="e.g., The Golden Fork - Downtown"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newAddress">Address</Label>
            <Input
              id="newAddress"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="newCity">City</Label>
              <Input
                id="newCity"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newState">State</Label>
              <Select
                value={form.state || "none"}
                onValueChange={(value) =>
                  setForm({ ...form, state: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">State</SelectItem>
                  {usStates.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newZip">ZIP</Label>
              <Input
                id="newZip"
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                placeholder="12345"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="newPhone">Phone</Label>
              <Input
                id="newPhone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="info@restaurant.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newWebsite">Website</Label>
            <Input
              id="newWebsite"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://restaurant.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="newCuisine">Cuisine Type</Label>
              <Select
                value={form.cuisineType || "none"}
                onValueChange={(value) =>
                  setForm({ ...form, cuisineType: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  {cuisineTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCapacity">Seating Capacity</Label>
              <Select
                value={form.seatingCapacity || "none"}
                onValueChange={(value) =>
                  setForm({ ...form, seatingCapacity: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select</SelectItem>
                  <SelectItem value="1-25">1-25</SelectItem>
                  <SelectItem value="26-50">26-50</SelectItem>
                  <SelectItem value="51-100">51-100</SelectItem>
                  <SelectItem value="100+">100+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.restaurantName || addRestaurant.isPending}
          >
            {addRestaurant.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Add Restaurant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
