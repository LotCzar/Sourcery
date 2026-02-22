"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Package,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useDriverDeliveries, useDriverStats, useUpdateDelivery } from "@/hooks/use-driver";
import { DeliveryCard } from "@/components/driver/delivery-card";
import { useToast } from "@/hooks/use-toast";

export default function DriverPage() {
  const { data: deliveriesResult, isLoading: deliveriesLoading } = useDriverDeliveries();
  const { data: statsResult, isLoading: statsLoading } = useDriverStats();
  const updateDelivery = useUpdateDelivery();
  const { toast } = useToast();

  const deliveries = deliveriesResult?.data ?? [];
  const stats = statsResult?.data;

  const activeDelivery = deliveries.find((d) => d.status === "IN_TRANSIT");
  const pendingDeliveries = deliveries.filter((d) => d.status !== "IN_TRANSIT");

  const handleMarkDelivered = (id: string) => {
    updateDelivery.mutate(
      { id, action: "deliver" },
      {
        onSuccess: () => toast({ title: "Delivery marked as complete!" }),
        onError: (err) =>
          toast({
            title: "Failed to update",
            description: err.message,
            variant: "destructive",
          }),
      }
    );
  };

  if (deliveriesLoading || statsLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold mt-1">
              {stats?.assignedToday ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-600" />
            <p className="text-2xl font-bold mt-1">
              {stats?.completedToday ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Truck className="h-5 w-5 mx-auto text-primary" />
            <p className="text-2xl font-bold mt-1">
              {activeDelivery ? 1 : 0}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Delivery */}
      {activeDelivery && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              Active Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold">{activeDelivery.restaurant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activeDelivery.orderNumber} - {activeDelivery.itemCount} items
                </p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                <Truck className="h-3 w-3 mr-1" />
                In Transit
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleMarkDelivered(activeDelivery.id)}
                disabled={updateDelivery.isPending}
              >
                {updateDelivery.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Mark Delivered
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href={`/driver/deliveries/${activeDelivery.id}`}>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Queue */}
      <div>
        <h2 className="font-semibold text-lg mb-3">
          {pendingDeliveries.length > 0
            ? `Delivery Queue (${pendingDeliveries.length})`
            : "Delivery Queue"}
        </h2>

        {deliveries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No deliveries assigned</p>
              <p className="text-sm text-muted-foreground">
                Your assigned deliveries will appear here
              </p>
            </CardContent>
          </Card>
        ) : pendingDeliveries.length === 0 && !activeDelivery ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="mt-3 font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                No pending deliveries right now
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingDeliveries.map((delivery) => (
              <DeliveryCard key={delivery.id} delivery={delivery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
