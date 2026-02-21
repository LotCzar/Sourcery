"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useInventory, useCreateInventory, useUpdateInventory } from "@/hooks/use-inventory";
import { useConsumptionInsights } from "@/hooks/use-consumption-insights";
import type { ConsumptionInsight } from "@/hooks/use-consumption-insights";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  AlertTriangle,
  Loader2,
  Search,
  Minus,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  ClipboardList,
  MapPin,
  DollarSign,
  History,
  Edit,
  PackageMinus,
  PackagePlus,
  Brain,
  ArrowRight,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  unit: string;
  parLevel: number | null;
  costPerUnit: number | null;
  location: string | null;
  notes: string | null;
  supplierProduct: {
    id: string;
    name: string;
    price: number;
    supplier: { id: string; name: string };
  } | null;
  recentLogs: {
    id: string;
    changeType: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    notes: string | null;
    createdBy: { firstName: string | null; lastName: string | null };
    createdAt: string;
  }[];
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Summary {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}

const categoryLabels: Record<string, string> = {
  PRODUCE: "Produce",
  MEAT: "Meat & Poultry",
  SEAFOOD: "Seafood",
  DAIRY: "Dairy",
  BAKERY: "Bakery",
  BEVERAGES: "Beverages",
  DRY_GOODS: "Dry Goods",
  FROZEN: "Frozen",
  CLEANING: "Cleaning",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
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

const changeTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  RECEIVED: { label: "Received", color: "text-green-600", icon: PackagePlus },
  USED: { label: "Used", color: "text-blue-600", icon: PackageMinus },
  ADJUSTED: { label: "Adjusted", color: "text-yellow-600", icon: Edit },
  WASTE: { label: "Waste", color: "text-red-600", icon: Trash2 },
  TRANSFERRED: { label: "Transferred", color: "text-purple-600", icon: RotateCcw },
  COUNT: { label: "Count", color: "text-gray-600", icon: ClipboardList },
};

export default function InventoryPage() {
  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  // Add item dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "PRODUCE",
    currentQuantity: "",
    unit: "EACH",
    parLevel: "",
    costPerUnit: "",
    location: "",
  });

  // Adjust quantity dialog
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState("RECEIVED");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  // View item dialog
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null);

  const { toast } = useToast();

  const { data: result, isLoading } = useInventory({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    lowStock: showLowStock || undefined,
  });
  const { data: insightsResult } = useConsumptionInsights();
  const createInventory = useCreateInventory();
  const updateInventory = useUpdateInventory();
  const queryClient = useQueryClient();

  const deleteInventoryMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/api/inventory/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });

  const items: InventoryItem[] = result?.data || [];
  const summary: Summary | null = result?.summary || null;

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.unit) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }

    try {
      await createInventory.mutateAsync({
        name: newItem.name,
        category: newItem.category,
        currentQuantity: newItem.currentQuantity ? parseFloat(newItem.currentQuantity) : 0,
        unit: newItem.unit,
        parLevel: newItem.parLevel ? parseFloat(newItem.parLevel) : undefined,
        costPerUnit: newItem.costPerUnit ? parseFloat(newItem.costPerUnit) : undefined,
        location: newItem.location || undefined,
      });
      setIsAddOpen(false);
      setNewItem({
        name: "",
        category: "PRODUCE",
        currentQuantity: "",
        unit: "EACH",
        parLevel: "",
        costPerUnit: "",
        location: "",
      });
    } catch (err) {
      toast({ title: "Failed to add item", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  const handleAdjustQuantity = async () => {
    if (!adjustItem || !adjustQuantity) return;

    try {
      await updateInventory.mutateAsync({
        id: adjustItem.id,
        adjustQuantity: parseFloat(adjustQuantity),
        changeType: adjustType,
        adjustmentNotes: adjustNotes || null,
      });
      setAdjustItem(null);
      setAdjustType("RECEIVED");
      setAdjustQuantity("");
      setAdjustNotes("");
    } catch (err) {
      toast({ title: "Failed to adjust quantity", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteInventoryMutation.mutateAsync(itemId);
    } catch (err) {
      toast({ title: "Failed to delete item", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatQuantity = (quantity: number, unit: string) => {
    return `${quantity.toFixed(quantity % 1 === 0 ? 0 : 2)} ${unitLabels[unit] || unit.toLowerCase()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Filter items by search
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query)
    );
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Track stock levels and manage inventory
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>
                Add a new item to track in your inventory
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name *</label>
                <Input
                  placeholder="e.g., Tomatoes"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category *</label>
                  <Select
                    value={newItem.category}
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit *</label>
                  <Select
                    value={newItem.unit}
                    onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(unitLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Quantity</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={newItem.currentQuantity}
                    onChange={(e) => setNewItem({ ...newItem, currentQuantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Par Level</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Min stock level"
                    value={newItem.parLevel}
                    onChange={(e) => setNewItem({ ...newItem, parLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost per Unit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      value={newItem.costPerUnit}
                      onChange={(e) => setNewItem({ ...newItem, costPerUnit: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    placeholder="e.g., Walk-in cooler"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={createInventory.isPending}>
                {createInventory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalItems}</div>
              <p className="text-xs text-muted-foreground">In inventory</p>
            </CardContent>
          </Card>

          <Card className={summary.lowStockCount > 0 ? "border-yellow-200 bg-yellow-50/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">Below par level</p>
            </CardContent>
          </Card>

          <Card className={summary.outOfStockCount > 0 ? "border-red-200 bg-red-50/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.outOfStockCount}</div>
              <p className="text-xs text-muted-foreground">Need reorder</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
              <p className="text-xs text-muted-foreground">Inventory value</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Consumption Insights */}
      {insightsResult?.data && insightsResult.data.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">AI Consumption Insights</CardTitle>
            </div>
            <CardDescription>
              Based on {insightsResult.summary.totalInsights} items analyzed
              {insightsResult.summary.criticalItemCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {insightsResult.summary.criticalItemCount} critical
                </Badge>
              )}
              {insightsResult.summary.parMismatchCount > 0 && (
                <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-700">
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
                    className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                        Par
                      </Badge>
                      <p className="font-medium text-sm">{insight.itemName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {insight.currentParLevel?.toFixed(1)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-yellow-700">
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? "default" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Inventory Items</h3>
              <p className="text-muted-foreground mb-4">
                {items.length === 0
                  ? "Add items to start tracking your inventory"
                  : "No items match your filters"}
              </p>
              {items.length === 0 && (
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Par Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.costPerUnit && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.costPerUnit)}/{unitLabels[item.unit]}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[item.category] || item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {item.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatQuantity(item.currentQuantity, item.unit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.parLevel
                        ? formatQuantity(item.parLevel, item.unit)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.isOutOfStock ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : item.isLowStock ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewItem(item)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAdjustItem(item);
                            setAdjustType("RECEIVED");
                          }}
                        >
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAdjustItem(item);
                            setAdjustType("USED");
                          }}
                        >
                          <TrendingDown className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Adjust Quantity Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={() => setAdjustItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Quantity</DialogTitle>
            <DialogDescription>
              {adjustItem?.name} - Current: {adjustItem && formatQuantity(adjustItem.currentQuantity, adjustItem.unit)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Adjustment Type</label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVED">Received (Add)</SelectItem>
                  <SelectItem value="USED">Used (Remove)</SelectItem>
                  <SelectItem value="WASTE">Waste (Remove)</SelectItem>
                  <SelectItem value="ADJUSTED">Adjustment</SelectItem>
                  <SelectItem value="COUNT">Physical Count (Set to)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {adjustType === "COUNT" ? "New Quantity" : "Quantity"}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {adjustItem && unitLabels[adjustItem.unit]}
                </span>
              </div>
              {adjustItem && adjustQuantity && adjustType !== "COUNT" && (
                <p className="text-sm text-muted-foreground">
                  New quantity:{" "}
                  {formatQuantity(
                    adjustType === "USED" || adjustType === "WASTE"
                      ? Math.max(0, adjustItem.currentQuantity - parseFloat(adjustQuantity || "0"))
                      : adjustItem.currentQuantity + parseFloat(adjustQuantity || "0"),
                    adjustItem.unit
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Optional notes..."
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustQuantity} disabled={!adjustQuantity || updateInventory.isPending}>
              {updateInventory.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Item History Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewItem?.name}</DialogTitle>
            <DialogDescription>
              {viewItem && formatQuantity(viewItem.currentQuantity, viewItem.unit)} in stock
            </DialogDescription>
          </DialogHeader>

          {viewItem && (
            <Tabs defaultValue="history">
              <TabsList className="w-full">
                <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-3 mt-4">
                {viewItem.recentLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No history yet
                  </p>
                ) : (
                  viewItem.recentLogs.map((log) => {
                    const config = changeTypeConfig[log.changeType] || changeTypeConfig.ADJUSTED;
                    const Icon = config.icon;
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div className={`mt-0.5 ${config.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{config.label}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm">
                            {log.previousQuantity} → {log.newQuantity} {unitLabels[viewItem.unit]}
                            <span className={`ml-2 ${log.quantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                              ({log.quantity >= 0 ? "+" : ""}{log.quantity})
                            </span>
                          </p>
                          {log.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                          )}
                          {log.createdBy && (
                            <p className="text-xs text-muted-foreground">
                              by {log.createdBy.firstName} {log.createdBy.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{categoryLabels[viewItem.category]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium">{unitLabels[viewItem.unit]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Par Level</p>
                    <p className="font-medium">
                      {viewItem.parLevel ? formatQuantity(viewItem.parLevel, viewItem.unit) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost per Unit</p>
                    <p className="font-medium">
                      {viewItem.costPerUnit ? formatCurrency(viewItem.costPerUnit) : "-"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{viewItem.location || "-"}</p>
                  </div>
                </div>

                {viewItem.supplierProduct && (
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Linked Supplier Product</p>
                    <p className="font-medium">{viewItem.supplierProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {viewItem.supplierProduct.supplier.name} • {formatCurrency(viewItem.supplierProduct.price)}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
