"use client";

import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Package,
  Loader2,
  Star,
  TrendingDown,
  X,
  Plus,
  Minus,
  ShoppingCart,
  Leaf,
  Drumstick,
  Fish,
  Milk,
  Coffee,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface Supplier {
  id: string;
  name: string;
  rating: number | null;
  minimumOrder: number | null;
  deliveryFee: number | null;
  leadTimeDays: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  unit: string;
  inStock: boolean;
  supplier: Supplier;
}

interface PriceComparison {
  name: string;
  category: string;
  suppliers: Product[];
  lowestPrice: number;
  highestPrice: number;
  savings: number;
}

interface FilterOption {
  name: string;
  count: number;
}

interface SupplierOption {
  id: string;
  name: string;
  productCount: number;
}

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

const categoryIcons: Record<string, React.ReactNode> = {
  PRODUCE: <Leaf className="h-4 w-4" />,
  MEAT: <Drumstick className="h-4 w-4" />,
  SEAFOOD: <Fish className="h-4 w-4" />,
  DAIRY: <Milk className="h-4 w-4" />,
  BEVERAGES: <Coffee className="h-4 w-4" />,
  DRY_GOODS: <Package className="h-4 w-4" />,
  BAKERY: <Package className="h-4 w-4" />,
  FROZEN: <Package className="h-4 w-4" />,
  OTHER: <Package className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  PRODUCE: "bg-green-100 text-green-700",
  MEAT: "bg-red-100 text-red-700",
  SEAFOOD: "bg-blue-100 text-blue-700",
  DAIRY: "bg-yellow-100 text-yellow-700",
  DRY_GOODS: "bg-orange-100 text-orange-700",
  BAKERY: "bg-amber-100 text-amber-700",
  BEVERAGES: "bg-purple-100 text-purple-700",
  FROZEN: "bg-cyan-100 text-cyan-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default function ProductsPage() {
  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [sortBy, setSortBy] = useState("name");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table" | "compare">("grid");

  // Shared cart
  const { addItem, updateQuantity, removeItem, getQuantity, getCartBySupplier, getCartTotal, cart } = useCart();

  const { data: result, isLoading, error } = useProducts({
    category: selectedCategory || undefined,
    search: search || undefined,
    supplierId: selectedSupplier || undefined,
  });

  const products: Product[] = result?.data?.products || [];
  const priceComparisons: PriceComparison[] = result?.data?.priceComparisons || [];
  const categories: FilterOption[] = result?.data?.filters?.categories || [];
  const suppliers: SupplierOption[] = result?.data?.filters?.suppliers || [];

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      productName: product.name,
      supplierId: product.supplier.id,
      supplierName: product.supplier.name,
      quantity: 1,
      unitPrice: product.price,
      unit: product.unit,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // React Query will automatically refetch when search state changes
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedSupplier("");
    setSortBy("name");
    setInStockOnly(false);
  };

  const filteredProducts = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const hasActiveFilters = selectedCategory || selectedSupplier || inStockOnly || search;
  const bySupplier = getCartBySupplier();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="mt-1 text-muted-foreground">
            Browse and compare products across all suppliers
          </p>
        </div>
      </div>

      {/* Floating Cart Panel */}
      {cart.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              Your Cart ({cart.length} items)
            </CardTitle>
            <CardDescription>
              Items from {Object.keys(bySupplier).length} supplier(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(bySupplier).map(([supplierId, { supplier, items, total }]) => (
              <div key={supplierId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Link href={`/suppliers/${supplierId}`} className="font-medium hover:underline">
                    {supplier}
                  </Link>
                  <span className="text-sm text-muted-foreground">${total.toFixed(2)}</span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between text-sm bg-white rounded p-2">
                      <span className="truncate flex-1 mr-2">{item.productName}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            ))}
            <div className="flex items-center justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${getCartTotal().toFixed(2)}</span>
            </div>
            <Button className="w-full" asChild>
              <Link href="/checkout">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Price Comparison Highlights */}
      {priceComparisons.length > 0 && viewMode !== "compare" && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingDown className="h-5 w-5" />
              Price Comparison Opportunities
            </CardTitle>
            <CardDescription>
              These products are available from multiple suppliers at different prices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {priceComparisons.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="min-w-[200px] rounded-lg border bg-white p-3"
                >
                  <p className="font-medium truncate">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-green-600 font-semibold">
                      ${item.lowestPrice.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">to</span>
                    <span className="text-red-600">
                      ${item.highestPrice.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-green-600">
                    Save up to ${item.savings.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setViewMode("compare")}
            >
              View all comparisons
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name.replace("_", " ")} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Supplier Filter */}
              <Select value={selectedSupplier || "all"} onValueChange={(value) => setSelectedSupplier(value === "all" ? "" : value)}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name} ({sup.productCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="price_asc">Price (Low-High)</SelectItem>
                  <SelectItem value="price_desc">Price (High-Low)</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inStock"
                    checked={inStockOnly}
                    onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
                  />
                  <Label htmlFor="inStock" className="text-sm">
                    In stock only
                  </Label>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear filters
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === "compare" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("compare")}
                >
                  Compare
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} products
          </p>

          {/* Compare View */}
          {viewMode === "compare" && (
            <div className="space-y-4">
              {priceComparisons.length > 0 ? (
                priceComparisons.map((comparison, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {categoryIcons[comparison.category]}
                            {comparison.name}
                          </CardTitle>
                          <CardDescription>
                            Available from {comparison.suppliers.length} suppliers
                          </CardDescription>
                        </div>
                        <Badge className="bg-green-100 text-green-700">
                          Save up to ${comparison.savings.toFixed(2)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Lead Time</TableHead>
                            <TableHead>Min Order</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.suppliers.map((product, pIdx) => (
                            <TableRow key={pIdx}>
                              <TableCell>
                                <Link
                                  href={`/suppliers/${product.supplier.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {product.supplier.name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    pIdx === 0
                                      ? "font-bold text-green-600"
                                      : ""
                                  }
                                >
                                  ${product.price.toFixed(2)}/
                                  {unitLabels[product.unit] || product.unit.toLowerCase()}
                                </span>
                                {pIdx === 0 && (
                                  <Badge className="ml-2 bg-green-500 text-xs">
                                    Lowest
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {product.supplier.rating ? (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    {product.supplier.rating.toFixed(1)}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {product.supplier.leadTimeDays} day
                                {product.supplier.leadTimeDays !== 1 ? "s" : ""}
                              </TableCell>
                              <TableCell>
                                ${product.supplier.minimumOrder?.toFixed(2) || "0"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddToCart(product)}
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Add
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="flex h-40 items-center justify-center">
                  <p className="text-muted-foreground">
                    No products available from multiple suppliers for comparison
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const cartQty = getQuantity(product.id);
                return (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <Badge
                        variant="outline"
                        className={`mb-2 ${categoryColors[product.category] || ""}`}
                      >
                        {categoryIcons[product.category]}
                        <span className="ml-1">{product.category}</span>
                      </Badge>
                      <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                      <Link
                        href={`/suppliers/${product.supplier.id}`}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        {product.supplier.name}
                      </Link>

                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <span className="text-xl font-bold">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">
                            /{unitLabels[product.unit] || product.unit.toLowerCase()}
                          </span>
                        </div>
                        {!product.inStock ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : cartQty > 0 ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(product.id, cartQty - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{cartQty}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(product.id, cartQty + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => handleAddToCart(product)}>
                            <Plus className="mr-1 h-4 w-4" />
                            Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const cartQty = getQuantity(product.id);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={categoryColors[product.category] || ""}
                            >
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/suppliers/${product.supplier.id}`}
                              className="hover:underline"
                            >
                              {product.supplier.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            ${product.price.toFixed(2)}/
                            {unitLabels[product.unit] || product.unit.toLowerCase()}
                          </TableCell>
                          <TableCell>
                            {product.inStock ? (
                              <Badge className="bg-green-100 text-green-700">
                                In Stock
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Out</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!product.inStock ? null : cartQty > 0 ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(product.id, cartQty - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm">{cartQty}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(product.id, cartQty + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddToCart(product)}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Add
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {filteredProducts.length === 0 && viewMode !== "compare" && (
            <Card className="flex h-40 items-center justify-center">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  No products found matching your criteria
                </p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
