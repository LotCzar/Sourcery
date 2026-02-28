"use client";

import { useState } from "react";
import { useSupplierInventory, useStockAdjustment } from "@/hooks/use-supplier-inventory";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Warehouse,
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";

export default function SupplierInventoryPage() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading } = useSupplierInventory(filter);
  const stockAdjust = useStockAdjustment();

  const products = data?.data?.products || [];
  const summary = data?.data?.summary || {
    totalProducts: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
  };

  async function handleAdjust(productId: string, quantity: number) {
    await stockAdjust.mutateAsync([{ productId, quantity }]);
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
                    <TableCell className="text-muted-foreground">{product.sku || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.stockQuantity ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {product.reorderPoint ?? "—"}
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
                      {product.expirationDate ? (
                        <span className={product.isExpiringSoon ? "text-orange-600 font-medium" : ""}>
                          {new Date(product.expirationDate).toLocaleDateString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAdjust(product.id, -1)}
                          disabled={stockAdjust.isPending || product.stockQuantity === 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAdjust(product.id, 1)}
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
    </div>
  );
}
