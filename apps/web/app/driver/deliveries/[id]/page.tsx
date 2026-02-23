"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Phone,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useDriverDelivery, useUpdateDelivery } from "@/hooks/use-driver";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Ready for Pickup", color: "bg-indigo-100 text-indigo-700" },
  IN_TRANSIT: { label: "In Transit", color: "bg-green-100 text-green-700" },
};

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data: result, isLoading } = useDriverDelivery(id);
  const updateDelivery = useUpdateDelivery();

  const [eta, setEta] = useState("");
  const [notes, setNotes] = useState("");

  const delivery = result?.data;

  const handleAction = (action: string) => {
    const payload: any = { id, action };
    if (eta) payload.estimatedDeliveryAt = new Date(eta).toISOString();
    if (notes) payload.trackingNotes = notes;

    updateDelivery.mutate(payload, {
      onSuccess: () => {
        const messages: Record<string, string> = {
          out_for_delivery: "Delivery started!",
          update_eta: "ETA updated!",
          deliver: "Delivery marked as complete!",
        };
        toast({ title: messages[action] || "Updated!" });
        if (action === "deliver") {
          router.push("/driver");
        }
        setEta("");
        setNotes("");
      },
      onError: (err) => {
        toast({
          title: "Failed to update",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="max-w-lg mx-auto">
        <p className="text-muted-foreground text-center mt-8">
          Delivery not found
        </p>
      </div>
    );
  }

  const config = statusConfig[delivery.status];

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/driver">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{delivery.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {delivery.supplier.name}
          </p>
        </div>
        {config && (
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
        )}
      </div>

      {/* Restaurant Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivery To</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-semibold">{delivery.restaurant.name}</p>
          {delivery.restaurant.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {delivery.restaurant.address}
              {delivery.restaurant.city && `, ${delivery.restaurant.city}`}
              {delivery.restaurant.state && `, ${delivery.restaurant.state}`}
              {delivery.restaurant.zipCode && ` ${delivery.restaurant.zipCode}`}
            </p>
          )}
          {delivery.restaurant.phone && (
            <a
              href={`tel:${delivery.restaurant.phone}`}
              className="text-sm text-primary flex items-center gap-2 hover:underline"
            >
              <Phone className="h-4 w-4" />
              {delivery.restaurant.phone}
            </a>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items ({delivery.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {delivery.items.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{item.product.name}</span>
                <span className="text-muted-foreground">
                  {Number(item.quantity)} {item.product.unit.toLowerCase()}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>${Number(delivery.total).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Notes from Restaurant */}
      {delivery.deliveryNotes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Delivery Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {delivery.deliveryNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ETA & Notes Input */}
      {(delivery.status === "SHIPPED" || delivery.status === "IN_TRANSIT") && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="eta" className="text-sm">
                Estimated Arrival
              </Label>
              <Input
                id="eta"
                type="datetime-local"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">
                Tracking Notes (optional)
              </Label>
              <Input
                id="notes"
                placeholder="e.g., Traffic on Highway 101"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2" data-tour="driver-delivery-actions">
        {(delivery.status === "CONFIRMED" || delivery.status === "SHIPPED") && (
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => handleAction("out_for_delivery")}
            disabled={updateDelivery.isPending}
          >
            {updateDelivery.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Truck className="h-4 w-4 mr-2" />
            )}
            Start Delivery
          </Button>
        )}

        {delivery.status === "IN_TRANSIT" && (
          <>
            {eta && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleAction("update_eta")}
                disabled={updateDelivery.isPending}
              >
                <Clock className="h-4 w-4 mr-2" />
                Update ETA
              </Button>
            )}
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => handleAction("deliver")}
              disabled={updateDelivery.isPending}
            >
              {updateDelivery.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark Delivered
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
