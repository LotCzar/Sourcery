"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePromotions } from "@/hooks/use-promotions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, Loader2, Calendar, DollarSign, Package } from "lucide-react";

const typeBadgeColors: Record<string, string> = {
  PERCENTAGE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FIXED_AMOUNT: "bg-blue-50 text-blue-700 border-blue-200",
  BUY_X_GET_Y: "bg-purple-50 text-purple-700 border-purple-200",
  FREE_DELIVERY: "bg-amber-50 text-amber-700 border-amber-200",
};

const typeLabels: Record<string, string> = {
  PERCENTAGE: "% Off",
  FIXED_AMOUNT: "$ Off",
  BUY_X_GET_Y: "Buy X Get Y",
  FREE_DELIVERY: "Free Delivery",
};

function formatValue(type: string, value: number, buyQty?: number | null, getQty?: number | null) {
  switch (type) {
    case "PERCENTAGE":
      return `${value}% off`;
    case "FIXED_AMOUNT":
      return `$${value.toFixed(2)} off`;
    case "BUY_X_GET_Y":
      return `Buy ${buyQty || 0}, Get ${getQty || 0}`;
    case "FREE_DELIVERY":
      return "Free Delivery";
    default:
      return `${value}`;
  }
}

export default function PromotionsPage() {
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const { data: result, isLoading } = usePromotions(
    supplierFilter !== "all" ? supplierFilter : undefined
  );

  const promotions = result?.data || [];

  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of promotions) {
      if (p.supplier) {
        map.set(p.supplier.id, p.supplier.name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [promotions]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promotions</h1>
          <p className="mt-1 text-muted-foreground">
            Browse active supplier promotions and deals
          </p>
        </div>
        {suppliers.length > 1 && (
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Promotions Grid */}
      {promotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tag className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No active promotions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for supplier deals and discounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo: any) => (
            <Card key={promo.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={typeBadgeColors[promo.type] || ""}
                  >
                    {typeLabels[promo.type] || promo.type}
                  </Badge>
                  <span className="text-lg font-bold text-primary">
                    {formatValue(promo.type, promo.value, promo.buyQuantity, promo.getQuantity)}
                  </span>
                </div>
                <CardTitle className="text-base mt-2">
                  {promo.description || formatValue(promo.type, promo.value, promo.buyQuantity, promo.getQuantity)}
                </CardTitle>
                {promo.supplier && (
                  <CardDescription>
                    by{" "}
                    <Link
                      href={`/suppliers/${promo.supplier.id}`}
                      className="text-primary hover:underline"
                    >
                      {promo.supplier.name}
                    </Link>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {new Date(promo.startDate).toLocaleDateString()} &ndash;{" "}
                    {new Date(promo.endDate).toLocaleDateString()}
                  </span>
                </div>
                {promo.minOrderAmount != null && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>Min order: ${promo.minOrderAmount.toFixed(2)}</span>
                  </div>
                )}
                {promo.productCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    <span>{promo.productCount} product{promo.productCount !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
