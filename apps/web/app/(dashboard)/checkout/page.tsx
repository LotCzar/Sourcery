"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2,
  Check,
  Plus,
  Minus,
  Trash2,
  Store,
  ShoppingBag,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";

const TAX_RATE = 0.0825;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, updateQuantity, removeItem, getCartBySupplier, getCartTotal, clearCart } = useCart();

  const [deliveryNotes, setDeliveryNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const bySupplier = getCartBySupplier();
  const subtotal = getCartTotal();
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handlePlaceOrders = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const orderPromises = Object.entries(bySupplier).map(
        async ([supplierId, { items }]) => {
          const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplierId,
              deliveryNotes: deliveryNotes[supplierId] || undefined,
              items: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to create order");
          }

          return response.json();
        }
      );

      await Promise.all(orderPromises);
      clearCart();
      setSuccess(true);
      setTimeout(() => router.push("/orders"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place orders");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Orders Placed Successfully!</h2>
          <p className="text-muted-foreground">
            {Object.keys(bySupplier).length} draft order(s) created. Redirecting to orders...
          </p>
          <Button asChild variant="outline">
            <Link href="/orders">View Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-muted-foreground">
            Add products to your cart before checking out
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
          <p className="mt-1 text-muted-foreground">
            Review your items and place your orders
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Per-supplier order cards */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(bySupplier).map(([supplierId, { supplier, items, total: supplierTotal }]) => (
            <Card key={supplierId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-muted-foreground" />
                  {supplier}
                </CardTitle>
                <CardDescription>
                  {items.length} {items.length === 1 ? "item" : "items"} &middot; Subtotal: ${supplierTotal.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
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
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Notes (optional)</label>
                  <Textarea
                    placeholder="Special delivery instructions for this supplier..."
                    value={deliveryNotes[supplierId] || ""}
                    onChange={(e) =>
                      setDeliveryNotes((prev) => ({ ...prev, [supplierId]: e.target.value }))
                    }
                    className="min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right column — Order summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                {Object.keys(bySupplier).length} supplier order(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(bySupplier).map(([supplierId, { supplier, total: supplierTotal }]) => (
                <div key={supplierId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{supplier}</span>
                  <span>${supplierTotal.toFixed(2)}</span>
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (8.25%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Estimated Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                Delivery fees will be calculated by each supplier. Final totals may vary.
              </p>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrders}
                disabled={isSubmitting || cart.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Orders...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Place {Object.keys(bySupplier).length} Order(s)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
