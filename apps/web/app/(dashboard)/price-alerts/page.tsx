"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bell,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Target,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PriceAlert {
  id: string;
  alertType: "PRICE_DROP" | "PRICE_INCREASE" | "PRICE_THRESHOLD";
  targetPrice: number;
  isActive: boolean;
  triggeredAt: string | null;
  triggeredPrice: number | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    currentPrice: number;
    unit: string;
    category: string;
    supplier: { id: string; name: string };
    priceHistory: { price: number; recordedAt: string }[];
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  supplier: string;
}

const alertTypeConfig = {
  PRICE_DROP: {
    label: "Price Drop",
    description: "Alert when price drops below target",
    icon: TrendingDown,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  PRICE_INCREASE: {
    label: "Price Increase",
    description: "Alert when price rises above target",
    icon: TrendingUp,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  PRICE_THRESHOLD: {
    label: "Price Threshold",
    description: "Alert when price crosses target",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
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

export default function PriceAlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create alert dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [alertType, setAlertType] = useState<string>("PRICE_DROP");
  const [targetPrice, setTargetPrice] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Selected alert for price history
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/price-alerts");
      const data = await response.json();

      if (data.success) {
        setAlerts(data.data);
      } else {
        setError(data.error || "Failed to fetch alerts");
      }
    } catch (err) {
      setError("Failed to fetch alerts");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.success && data.data.products) {
        setProducts(data.data.products);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateAlert = async () => {
    if (!selectedProduct || !alertType || !targetPrice) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          alertType,
          targetPrice: parseFloat(targetPrice),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsCreateOpen(false);
        setSelectedProduct(null);
        setAlertType("PRICE_DROP");
        setTargetPrice("");
        setSearchQuery("");
        fetchAlerts();
      } else {
        alert(data.error || "Failed to create alert");
      }
    } catch (err) {
      console.error("Create error:", err);
      alert("Failed to create alert");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("Are you sure you want to delete this alert?")) return;

    try {
      const response = await fetch(`/api/price-alerts/${alertId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchAlerts();
      } else {
        alert(data.error || "Failed to delete alert");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete alert");
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/price-alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await response.json();

      if (data.success) {
        fetchAlerts();
      } else {
        alert(data.error || "Failed to update alert");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update alert");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const activeAlerts = alerts.filter((a) => a.isActive && !a.triggeredAt);
  const triggeredAlerts = alerts.filter((a) => a.triggeredAt);
  const pausedAlerts = alerts.filter((a) => !a.isActive);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Price Alerts</h1>
          <p className="text-muted-foreground">
            Get notified when product prices change
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
              <DialogDescription>
                Set up an alert to be notified when a product's price changes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Product Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Product</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search for a product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Search Results */}
                {(products.length > 0 || isSearching) && !selectedProduct && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      products.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            setTargetPrice(product.price.toString());
                            setSearchQuery("");
                          }}
                          className="w-full p-3 text-left hover:bg-muted border-b last:border-0"
                        >
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.supplier} • {formatCurrency(product.price)}/
                            {unitLabels[product.unit] || product.unit.toLowerCase()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Product */}
                {selectedProduct && (
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedProduct.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedProduct.supplier} • Current:{" "}
                          {formatCurrency(selectedProduct.price)}/
                          {unitLabels[selectedProduct.unit] || selectedProduct.unit.toLowerCase()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Alert Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Alert Type</label>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(alertTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`h-4 w-4 ${config.color}`} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {alertTypeConfig[alertType as keyof typeof alertTypeConfig]?.description}
                </p>
              </div>

              {/* Target Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
                {selectedProduct && targetPrice && (
                  <p className="text-xs text-muted-foreground">
                    {alertType === "PRICE_DROP" && (
                      <>
                        Alert when price drops below {formatCurrency(parseFloat(targetPrice))}
                        {parseFloat(targetPrice) < selectedProduct.price && (
                          <span className="text-green-600 ml-1">
                            ({((1 - parseFloat(targetPrice) / selectedProduct.price) * 100).toFixed(1)}% below current)
                          </span>
                        )}
                      </>
                    )}
                    {alertType === "PRICE_INCREASE" && (
                      <>
                        Alert when price rises above {formatCurrency(parseFloat(targetPrice))}
                        {parseFloat(targetPrice) > selectedProduct.price && (
                          <span className="text-red-600 ml-1">
                            ({((parseFloat(targetPrice) / selectedProduct.price - 1) * 100).toFixed(1)}% above current)
                          </span>
                        )}
                      </>
                    )}
                    {alertType === "PRICE_THRESHOLD" && (
                      <>Alert when price crosses {formatCurrency(parseFloat(targetPrice))}</>
                    )}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAlert}
                disabled={!selectedProduct || !targetPrice || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Monitoring prices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Triggered</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{triggeredAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Alerts fired</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pausedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Inactive alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              Active Alerts
            </CardTitle>
            <CardDescription>Currently monitoring these products</CardDescription>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active alerts</p>
                <p className="text-sm">Create an alert to start monitoring prices</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => {
                  const config = alertTypeConfig[alert.alertType];
                  const Icon = config.icon;
                  const priceDiff = alert.targetPrice - alert.product.currentPrice;
                  const priceDiffPercent = (priceDiff / alert.product.currentPrice) * 100;

                  return (
                    <div
                      key={alert.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium">{alert.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {alert.product.supplier.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm">
                                Current: {formatCurrency(alert.product.currentPrice)}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-sm font-medium">
                                Target: {formatCurrency(alert.targetPrice)}
                              </span>
                              {priceDiff !== 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {priceDiff > 0 ? (
                                    <ArrowUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3 mr-1" />
                                  )}
                                  {Math.abs(priceDiffPercent).toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAlert(alert.id, alert.isActive);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAlert(alert.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Price History Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Price History</CardTitle>
            <CardDescription>
              {selectedAlert
                ? `${selectedAlert.product.name} - Last 30 days`
                : "Select an alert to view price history"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedAlert && selectedAlert.product.priceHistory.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedAlert.product.priceHistory.slice().reverse()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="recordedAt"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${value}`}
                      tick={{ fontSize: 12 }}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Price"]}
                      labelFormatter={(label) => formatDate(label)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: "#3B82F6" }}
                    />
                    {/* Target price line */}
                    <Line
                      type="monotone"
                      dataKey={() => selectedAlert.targetPrice}
                      stroke="#22C55E"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-sm text-muted-foreground">Actual Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-green-500 border-dashed" style={{ borderStyle: "dashed" }} />
                    <span className="text-sm text-muted-foreground">Target Price</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {selectedAlert
                  ? "No price history available"
                  : "Select an alert to view its price history"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Triggered Alerts
            </CardTitle>
            <CardDescription>Alerts that have been activated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {triggeredAlerts.map((alert) => {
                const config = alertTypeConfig[alert.alertType];
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium">{alert.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.product.supplier.name}
                          </p>
                          <p className="text-sm mt-1">
                            Triggered at {formatCurrency(alert.triggeredPrice!)} on{" "}
                            {new Date(alert.triggeredAt!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAlert(alert.id, false)}
                      >
                        Reactivate
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {alerts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Price Alerts</h3>
              <p className="text-muted-foreground mb-4">
                Create your first price alert to start monitoring product prices
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
