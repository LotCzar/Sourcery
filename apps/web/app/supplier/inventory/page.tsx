"use client";

import { useState } from "react";
import { useSupplierInventory, useStockAdjustment } from "@/hooks/use-supplier-inventory";
import { useUpdateSupplierProduct } from "@/hooks/use-supplier-products";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Warehouse,
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Minus,
  Pencil,
} from "lucide-react";

export default function SupplierInventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useSupplierInventory(filter);
  const stockAdjust = useStockAdjustment();
  const updateProduct = useUpdateSupplierProduct();

  // Adjustment dialog state
  const [adjustDialog, setAdjustDialog] = useState<{ productId: string; productName: string; direction: number } | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{ productId: string; productName: string; field: "reorderPoint" | "expirationDate"; currentValue: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const products = data?.data?.products || [];
  const summary = data?.data?.summary || {
    totalProducts: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
  };

  function openAdjustDialog(productId: string, productName: string, direction: number) {
    setAdjustDialog({ productId, productName, direction });
    setAdjustQuantity("1");
    setAdjustReason("");
  }

  async function handleAdjustSubmit() {
    if (!adjustDialog) return;
    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", description: "Please enter a positive number.", variant: "destructive" });
      return;
    }
    try {
      await stockAdjust.mutateAsync([{
        productId: adjustDialog.productId,
        quantity: adjustDialog.direction * qty,
        reason: adjustReason || undefined,
      }]);
      toast({ title: "Stock adjusted successfully" });
      setAdjustDialog(null);
    } catch (err: any) {
      toast({ title: "Failed to adjust stock", description: err.message, variant: "destructive" });
    }
  }

  function openEditDialog(productId: string, productName: string, field: "reorderPoint" | "expirationDate", currentValue: any) {
    setEditDialog({ productId, productName, field, currentValue: currentValue ?? "" });
    if (field === "expirationDate" && currentValue) {
      setEditValue(new Date(currentValue).toISOString().split("T")[0]);
    } else {
      setEditValue(currentValue?.toString() ?? "");
    }
  }

  async function handleEditSubmit() {
    if (!editDialog) return;
    try {
      const payload: Record<string, unknown> = { id: editDialog.productId };
      if (editDialog.field === "reorderPoint") {
        const val = parseInt(editValue, 10);
        if (isNaN(val) || val < 0) {
          toast({ title: "Invalid value", description: "Reorder point must be a non-negative number.", variant: "destructive" });
          return;
        }
        payload.reorderPoint = val;
      } else {
        payload.expirationDate = editValue || null;
      }
      await updateProduct.mutateAsync(payload as any);
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.inventory.all });
      toast({ title: `${editDialog.field === "reorderPoint" ? "Reorder point" : "Expiration date"} updated` });
      setEditDialog(null);
    } catch (err: any) {
      toast({ title: "Failed to update product", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground">Track stock levels, reorder points, and expiration dates</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <Package className="h-4 w-4" />
              <span className="text-sm">In Stock</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.inStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Low Stock</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Out of Stock</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.outOfStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Expiring Soon</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-orange-600">{summary.expiringSoonCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="expiring-soon">Expiring Soon</TabsTrigger>
          <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Product Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Products ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No products found for this filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="text-center">Adjust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.sku || "\u2014"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.stockQuantity ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                        onClick={() => openEditDialog(product.id, product.name, "reorderPoint", product.reorderPoint)}
                      >
                        {product.reorderPoint ?? "\u2014"}
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      </button>
                    </TableCell>
                    <TableCell>
                      {product.isOutOfStock ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : product.isLowStock ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground hover:underline cursor-pointer"
                        onClick={() => openEditDialog(product.id, product.name, "expirationDate", product.expirationDate)}
                      >
                        {product.expirationDate ? (
                          <span className={product.isExpiringSoon ? "text-orange-600 font-medium" : ""}>
                            {new Date(product.expirationDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{"\u2014"}</span>
                        )}
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openAdjustDialog(product.id, product.name, -1)}
                          disabled={stockAdjust.isPending || product.stockQuantity === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openAdjustDialog(product.id, product.name, 1)}
                          disabled={stockAdjust.isPending}
                        >
                          <Plus className="h-3 w-3" />
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

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {adjustDialog?.direction === 1 ? "Add" : "Remove"} Stock
            </DialogTitle>
            <DialogDescription>
              {adjustDialog?.productName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adjust-qty">Quantity</Label>
              <Input
                id="adjust-qty"
                type="number"
                min="1"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="adjust-reason">Reason (optional)</Label>
              <Input
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g., Received shipment, Damaged goods..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={stockAdjust.isPending}
            >
              {stockAdjust.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adjustDialog?.direction === 1 ? "Add" : "Remove"} Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Field Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Edit {editDialog?.field === "reorderPoint" ? "Reorder Point" : "Expiration Date"}
            </DialogTitle>
            <DialogDescription>
              {editDialog?.productName}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="edit-value">
              {editDialog?.field === "reorderPoint" ? "Reorder Point" : "Expiration Date"}
            </Label>
            {editDialog?.field === "reorderPoint" ? (
              <Input
                id="edit-value"
                type="number"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            ) : (
              <Input
                id="edit-value"
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateProduct.isPending}
            >
              {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
