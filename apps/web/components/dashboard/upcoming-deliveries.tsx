"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  CheckCircle,
  Clock,
  Package,
  ArrowRight,
  Phone,
  User,
} from "lucide-react";

interface UpcomingDelivery {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  deliveryDate: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  inTransitAt: string | null;
  trackingNotes: string | null;
  supplier: { id: string; name: string };
  driver: { id: string; firstName: string | null; phone: string | null } | null;
  itemCount: number;
}

interface UpcomingDeliveriesProps {
  deliveries: UpcomingDelivery[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  SHIPPED: {
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-700",
    icon: <Package className="h-3 w-3" />,
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: "bg-green-100 text-green-700",
    icon: <Truck className="h-3 w-3" />,
  },
};

function formatEtaDisplay(
  estimatedDeliveryAt: string | null,
  deliveryDate: string | null
) {
  const dateStr = estimatedDeliveryAt || deliveryDate;
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / (1000 * 60));

  if (estimatedDeliveryAt) {
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (diffMin < 0) {
      return {
        label: `ETA: ${time}`,
        relative: `${Math.abs(diffMin)} min overdue`,
        isOverdue: true,
      };
    }
    if (diffMin < 60) {
      return {
        label: `ETA: ${time}`,
        relative: `Arriving in ~${diffMin} min`,
        isOverdue: false,
      };
    }
    return {
      label: `ETA: ${time}`,
      relative: null,
      isOverdue: false,
    };
  }

  return {
    label: `Expected: ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    relative: null,
    isOverdue: false,
  };
}

export function UpcomingDeliveries({ deliveries }: UpcomingDeliveriesProps) {
  if (deliveries.length === 0) return null;

  return (
    <Card data-tour="upcoming-deliveries">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Upcoming Deliveries
          </CardTitle>
          <CardDescription>
            {deliveries.length} order{deliveries.length !== 1 ? "s" : ""} in progress
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deliveries.map((delivery) => {
            const config = statusConfig[delivery.status];
            const etaInfo = formatEtaDisplay(
              delivery.estimatedDeliveryAt,
              delivery.deliveryDate
            );

            return (
              <Link
                key={delivery.id}
                href="/orders"
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {delivery.status === "IN_TRANSIT" ? (
                    <div className="relative">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                    </div>
                  ) : (
                    <div className="h-3 w-3" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {delivery.orderNumber}
                      </span>
                      {config && (
                        <Badge variant="outline" className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {delivery.supplier.name} - {delivery.itemCount} items
                    </p>
                    {delivery.driver && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />
                        {delivery.driver.firstName || "Driver"}
                        {delivery.driver.phone && (
                          <>
                            <Phone className="h-3 w-3 ml-1" />
                            {delivery.driver.phone}
                          </>
                        )}
                      </p>
                    )}
                    {delivery.trackingNotes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic truncate">
                        {delivery.trackingNotes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {etaInfo && (
                    <>
                      <p className="text-sm font-medium flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {etaInfo.label}
                      </p>
                      {etaInfo.relative && (
                        <p
                          className={`text-xs ${
                            etaInfo.isOverdue
                              ? "text-red-600 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {etaInfo.relative}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
