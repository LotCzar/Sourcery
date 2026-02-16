"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Truck,
  Clock,
  DollarSign,
  Package,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Loader2,
  ArrowRight,
  Leaf,
  Drumstick,
  Fish,
  Milk,
  Coffee,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  unit: string;
  inStock: boolean;
}

interface Supplier {
  id: string;
  name: string;
  description: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  website: string | null;
  logoUrl: string | null;
  minimumOrder: number | null;
  deliveryFee: number | null;
  leadTimeDays: number;
  rating: number | null;
  reviewCount: number;
  products: Product[];
  _count: { products: number };
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
  PRODUCE: "bg-green-100 text-green-700 hover:bg-green-200",
  MEAT: "bg-red-100 text-red-700 hover:bg-red-200",
  SEAFOOD: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  DAIRY: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  DRY_GOODS: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  BAKERY: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  BEVERAGES: "bg-purple-100 text-purple-700 hover:bg-purple-200",
  FROZEN: "bg-cyan-100 text-cyan-700 hover:bg-cyan-200",
  OTHER: "bg-gray-100 text-gray-700 hover:bg-gray-200",
};

export default function SupplierDetailPage() {
  const params = useParams();
  const { addItem, updateQuantity, getQuantity, getCartTotal, cart } = useCart();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchSupplier = useCallback(async () => {
    try {
      const response = await fetch(`/api/suppliers/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch supplier");
      }

      setSupplier(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  const handleAddToCart = (product: Product) => {
    if (!supplier) return;
    addItem({
      productId: product.id,
      productName: product.name,
      supplierId: supplier.id,
      supplierName: supplier.name,
      quantity: 1,
      unitPrice: product.price,
      unit: product.unit,
    });
  };

  // Filter cart to items from this supplier
  const supplierCart = cart.filter((item) => item.supplierId === supplier?.id);
  const supplierCartTotal = supplierCart.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !supplier) {
    return (
      <div className="space-y-6">
        <Link href="/suppliers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Suppliers
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!supplier) return null;

  // Get unique categories from products
  const categories = Array.from(
    new Set(supplier.products.map((p) => p.category))
  ).sort();

  // Filter products
  const filteredProducts = supplier.products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/suppliers">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Suppliers
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={supplier.logoUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {supplier.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{supplier.name}</h1>
              <Badge className="bg-green-100 text-green-700">Verified</Badge>
            </div>
            <p className="mt-1 max-w-xl text-muted-foreground">
              {supplier.description}
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">
                  {supplier.rating?.toFixed(1) || "N/A"}
                </span>
                <span className="text-muted-foreground">
                  ({supplier.reviewCount} reviews)
                </span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {supplier._count.products} products
              </span>
            </div>
          </div>
        </div>

        {/* Cart Summary */}
        {supplierCart.length > 0 && (
          <Card className="w-full lg:w-80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                Your Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-32 overflow-y-auto space-y-2">
                {supplierCart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{item.productName}</span>
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
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>${supplierCartTotal.toFixed(2)}</span>
              </div>
              {supplier.minimumOrder && supplierCartTotal < supplier.minimumOrder && (
                <p className="text-xs text-orange-600">
                  Minimum order: ${supplier.minimumOrder.toFixed(2)} (${(supplier.minimumOrder - supplierCartTotal).toFixed(2)} more needed)
                </p>
              )}
              <Link href="/checkout" className="block">
                <Button className="w-full">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All ({supplier.products.length})
                </Button>
                {categories.map((category) => {
                  const count = supplier.products.filter(
                    (p) => p.category === category
                  ).length;
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={selectedCategory !== category ? categoryColors[category] : ""}
                    >
                      {categoryIcons[category]}
                      <span className="ml-1">
                        {category.replace("_", " ")} ({count})
                      </span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const cartQty = getQuantity(product.id);
              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge
                          variant="outline"
                          className={`mb-2 ${categoryColors[product.category] || ""}`}
                        >
                          {categoryIcons[product.category]}
                          <span className="ml-1">{product.category}</span>
                        </Badge>
                        <h3 className="font-semibold">{product.name}</h3>
                        {product.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

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

          {filteredProducts.length === 0 && (
            <Card className="flex h-40 items-center justify-center">
              <p className="text-muted-foreground">
                No products found matching your search.
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.address && (
                <>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{supplier.address}</p>
                      <p className="text-muted-foreground">
                        {supplier.city}, {supplier.state} {supplier.zipCode}
                      </p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              {supplier.phone && (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                  <Separator />
                </>
              )}
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="break-all">{supplier.email}</span>
              </div>
              {supplier.website && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {supplier.website.replace("https://", "")}
                    </a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Minimum Order</span>
                </div>
                <span className="font-semibold">
                  ${supplier.minimumOrder?.toFixed(2) || "0.00"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Delivery Fee</span>
                </div>
                <span className="font-semibold">
                  ${supplier.deliveryFee?.toFixed(2) || "0.00"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Lead Time</span>
                </div>
                <span className="font-semibold">
                  {supplier.leadTimeDays} day{supplier.leadTimeDays !== 1 ? "s" : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
