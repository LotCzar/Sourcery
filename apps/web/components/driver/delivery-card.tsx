"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  MapPin,
  Package,
  Clock,
  Truck,
  CheckCircle,
  ChevronRight,
} from "lucide-react";

interface DeliveryCardProps {
  delivery: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    estimatedDeliveryAt: string | null;
    deliveryDate: string | null;
    trackingNotes: string | null;
    restaurant: {
      name: string;
      address: string | null;
      city: string | null;
      state: string | null;
    };
    itemCount: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  SHIPPED: {
    label: "Ready",
    color: "bg-indigo-100 text-indigo-700",
    icon: <Package className="h-3 w-3" />,
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: "bg-green-100 text-green-700",
    icon: <Truck className="h-3 w-3" />,
  },
};

function formatEta(
  estimatedDeliveryAt: string | null,
  deliveryDate: string | null
): string | null {
  const dateStr = estimatedDeliveryAt || deliveryDate;
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / (1000 * 60));

  if (estimatedDeliveryAt) {
    if (diffMin < 0) {
      return `${Math.abs(diffMin)} min overdue`;
    }
    if (diffMin < 60) {
      return `~${diffMin} min`;
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DeliveryCard({ delivery }: DeliveryCardProps) {
  const config = statusConfig[delivery.status];
  const eta = formatEta(delivery.estimatedDeliveryAt, delivery.deliveryDate);

  return (
    <Link href={`/driver/deliveries/${delivery.id}`}>
      <Card className="transition-all hover:shadow-md active:scale-[0.99]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">
                  {delivery.orderNumber}
                </span>
                {config && (
                  <Badge variant="outline" className={config.color}>
                    {config.icon}
                    <span className="ml-1">{config.label}</span>
                  </Badge>
                )}
              </div>

              <p className="font-medium truncate">
                {delivery.restaurant.name}
              </p>

              {delivery.restaurant.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {delivery.restaurant.address}
                    {delivery.restaurant.city && `, ${delivery.restaurant.city}`}
                  </span>
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {delivery.itemCount} items
                </span>
                {eta && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {eta}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
