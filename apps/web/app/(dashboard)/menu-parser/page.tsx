"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Loader2,
  ChefHat,
  Leaf,
  Drumstick,
  Fish,
  Milk,
  Package,
  Coffee,
  Check,
  Search,
  ShoppingCart,
  ArrowRight,
  X,
  Plus,
  Minus,
  Store,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface Ingredient {
  name: string;
  category: string;
  estimatedQuantity: string;
  unit: string;
  notes?: string;
}

interface MenuItem {
  name: string;
  description: string;
  ingredients: Ingredient[];
}

interface ParsedResult {
  menuItems: MenuItem[];
  summary: {
    totalDishes: number;
    totalIngredients: number;
    categories: Record<string, number>;
  };
}

interface SupplierProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
}

interface Supplier {
  id: string;
  name: string;
  rating: number | null;
  minimumOrder: number | null;
  deliveryFee: number | null;
  leadTimeDays: number;
}

interface ProductMatch {
  product: SupplierProduct;
  supplier: Supplier;
  score: number;
}

interface MatchedIngredient {
  ingredient: Ingredient;
  matches: ProductMatch[];
  bestMatch: ProductMatch | null;
}

interface MatchResult {
  ingredients: MatchedIngredient[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    suppliersFound: number;
  };
  suppliers: Supplier[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  PRODUCE: <Leaf className="h-4 w-4 text-green-500" />,
  MEAT: <Drumstick className="h-4 w-4 text-red-500" />,
  SEAFOOD: <Fish className="h-4 w-4 text-blue-500" />,
  DAIRY: <Milk className="h-4 w-4 text-yellow-500" />,
  DRY_GOODS: <Package className="h-4 w-4 text-orange-500" />,
  BEVERAGES: <Coffee className="h-4 w-4 text-purple-500" />,
  BAKERY: <Package className="h-4 w-4 text-amber-500" />,
  OTHER: <Package className="h-4 w-4 text-gray-500" />,
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

type ViewMode = "parse" | "source" | "cart";

export default function MenuParserPage() {
  const [menuText, setMenuText] = useState("");
  const [menuType, setMenuType] = useState("restaurant");
  const [isLoading, setIsLoading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("parse");

  // Shared cart
  const { addItem, updateQuantity, removeItem, getCartBySupplier, getCartTotal, cart } = useCart();

  const handleAddToCart = (match: ProductMatch) => {
    addItem({
      productId: match.product.id,
      productName: match.product.name,
      supplierId: match.supplier.id,
      supplierName: match.supplier.name,
      quantity: 1,
      unitPrice: Number(match.product.price),
      unit: match.product.unit,
    });
  };

  const handleParse = async () => {
    if (!menuText.trim()) {
      setError("Please enter your menu text");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setMatchResult(null);
    setViewMode("parse");

    try {
      const response = await fetch("/api/ai/parse-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuText, menuType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse menu");
      }

      if (data.parsed && data.data) {
        setResult(data.data);
        if (data.data.menuItems?.length > 0) {
          setSelectedDish(data.data.menuItems[0].name);
        }
      } else {
        setError("Could not parse the menu. Please try again with more details.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceIngredients = async () => {
    if (!result) return;

    // Collect all unique ingredients from all dishes
    const allIngredients: Ingredient[] = [];
    const seen = new Set<string>();

    result.menuItems.forEach((item) => {
      item.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allIngredients.push(ing);
        }
      });
    });

    setIsMatching(true);
    setError(null);

    try {
      const response = await fetch("/api/ingredients/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: allIngredients }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to match ingredients");
      }

      setMatchResult(data.data);
      setViewMode("source");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsMatching(false);
    }
  };

  const selectedMenuItem = result?.menuItems.find(
    (item) => item.name === selectedDish
  );

  const bySupplier = getCartBySupplier();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Menu Parser</h1>
          <p className="mt-1 text-muted-foreground">
            Paste your menu and let AI extract ingredients, then source from suppliers
          </p>
        </div>
        {cart.length > 0 && (
          <Button
            variant={viewMode === "cart" ? "default" : "outline"}
            onClick={() => setViewMode(viewMode === "cart" ? "source" : "cart")}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cart ({cart.length}) - ${getCartTotal().toFixed(2)}
          </Button>
        )}
      </div>

      {/* View Mode Tabs */}
      {result && (
        <div className="flex gap-2">
          <Button
            variant={viewMode === "parse" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("parse")}
          >
            <ChefHat className="mr-2 h-4 w-4" />
            Parsed Menu
          </Button>
          <Button
            variant={viewMode === "source" ? "default" : "outline"}
            size="sm"
            onClick={() => matchResult ? setViewMode("source") : handleSourceIngredients()}
            disabled={isMatching}
          >
            {isMatching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {matchResult ? "Source Ingredients" : "Find Suppliers"}
          </Button>
          {cart.length > 0 && (
            <Button
              variant={viewMode === "cart" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cart")}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Review Order
            </Button>
          )}
        </div>
      )}

      {/* Cart View */}
      {viewMode === "cart" && cart.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Your Order
              </CardTitle>
              <CardDescription>
                Review items before checking out
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(bySupplier).map(([supplierId, { supplier, items, total }]) => (
                <div key={supplierId} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{supplier}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Subtotal: ${total.toFixed(2)}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell>
                            ${item.unitPrice.toFixed(2)}/{item.unit.toLowerCase()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => removeItem(item.productId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-lg font-semibold">
                    Total: ${getCartTotal().toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(bySupplier).length} supplier(s)
                  </p>
                </div>
                <Button size="lg" asChild>
                  <Link href="/checkout">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Source View */}
      {viewMode === "source" && matchResult && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Supplier Matches Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold">{matchResult.summary.total}</p>
                  <p className="text-sm text-muted-foreground">Ingredients</p>
                </div>
                <div className="rounded-lg bg-green-100 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {matchResult.summary.matched}
                  </p>
                  <p className="text-sm text-green-600">Matched</p>
                </div>
                <div className="rounded-lg bg-orange-100 p-3 text-center">
                  <p className="text-2xl font-bold text-orange-700">
                    {matchResult.summary.unmatched}
                  </p>
                  <p className="text-sm text-orange-600">Unmatched</p>
                </div>
                <div className="rounded-lg bg-blue-100 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {matchResult.summary.suppliersFound}
                  </p>
                  <p className="text-sm text-blue-600">Suppliers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matched Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle>Match Ingredients to Products</CardTitle>
              <CardDescription>
                Click &quot;Add&quot; to add products to your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matchResult.ingredients.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {categoryIcons[item.ingredient.category] || categoryIcons.OTHER}
                        <span className="font-medium">{item.ingredient.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.ingredient.estimatedQuantity} {item.ingredient.unit?.toLowerCase()}
                        </Badge>
                      </div>
                      {item.matches.length === 0 && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-700">
                          No matches found
                        </Badge>
                      )}
                    </div>

                    {item.matches.length > 0 && (
                      <div className="space-y-2">
                        {item.matches.slice(0, 3).map((match, matchIdx) => (
                          <div
                            key={matchIdx}
                            className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{match.product.name}</span>
                                {matchIdx === 0 && (
                                  <Badge className="bg-green-500 text-xs">Best Match</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{match.supplier.name}</span>
                                <span className="font-medium text-foreground">
                                  ${Number(match.product.price).toFixed(2)}/{match.product.unit.toLowerCase()}
                                </span>
                                {match.supplier.rating && (
                                  <span>&#11088; {Number(match.supplier.rating).toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddToCart(match)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parse View */}
      {viewMode === "parse" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Your Menu
              </CardTitle>
              <CardDescription>
                Paste your menu items below. Include dish names and descriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="menuType">Menu Type</Label>
                <Select value={menuType} onValueChange={setMenuType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant Menu</SelectItem>
                    <SelectItem value="cafe">Cafe/Bistro Menu</SelectItem>
                    <SelectItem value="bar">Bar Menu</SelectItem>
                    <SelectItem value="catering">Catering Menu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="menuText">Menu Content</Label>
                <Textarea
                  id="menuText"
                  placeholder="Example:

STARTERS
Caesar Salad - Crisp romaine, parmesan, croutons, house-made dressing
Tomato Soup - Fresh tomatoes, basil, cream

MAINS
Grilled Salmon - Atlantic salmon, lemon butter, seasonal vegetables
Ribeye Steak - 12oz USDA Prime, garlic mashed potatoes, asparagus

DESSERTS
Chocolate Cake - Dark chocolate, raspberry coulis"
                  className="min-h-[300px] font-mono text-sm"
                  value={menuText}
                  onChange={(e) => setMenuText(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button
                onClick={handleParse}
                disabled={isLoading || !menuText.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Menu...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Parse Menu with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Summary Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" />
                      Analysis Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-muted p-3 text-center">
                        <p className="text-2xl font-bold">{result.summary.totalDishes}</p>
                        <p className="text-sm text-muted-foreground">Dishes Found</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 text-center">
                        <p className="text-2xl font-bold">{result.summary.totalIngredients}</p>
                        <p className="text-sm text-muted-foreground">Ingredients</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(result.summary.categories || {}).map(([category, count]) => (
                        <Badge
                          key={category}
                          variant="outline"
                          className={categoryColors[category] || categoryColors.OTHER}
                        >
                          {categoryIcons[category]}
                          <span className="ml-1">{category.replace("_", " ")}: {count}</span>
                        </Badge>
                      ))}
                    </div>
                    <Button
                      className="mt-4 w-full"
                      onClick={handleSourceIngredients}
                      disabled={isMatching}
                    >
                      {isMatching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Finding Suppliers...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Find Suppliers for Ingredients
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Dishes List */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Menu Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.menuItems.map((item) => (
                        <Button
                          key={item.name}
                          variant={selectedDish === item.name ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedDish(item.name)}
                        >
                          {item.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Ingredients Table */}
                {selectedMenuItem && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>{selectedMenuItem.name}</CardTitle>
                      <CardDescription>{selectedMenuItem.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingredient</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedMenuItem.ingredients.map((ingredient, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {ingredient.name}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={categoryColors[ingredient.category] || categoryColors.OTHER}
                                >
                                  {categoryIcons[ingredient.category]}
                                  <span className="ml-1">{ingredient.category}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {ingredient.estimatedQuantity} {ingredient.unit?.toLowerCase()}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {ingredient.notes || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="flex h-[400px] items-center justify-center">
                <div className="text-center">
                  <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    Paste your menu and click &quot;Parse Menu with AI&quot; to extract ingredients
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
