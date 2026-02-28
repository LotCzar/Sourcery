"use client";

import { useState } from "react";
import {
  useDeliveryZones,
  useCreateDeliveryZone,
  useUpdateDeliveryZone,
  useDeleteDeliveryZone,
} from "@/hooks/use-supplier-portal";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Map, Loader2, Plus, Trash2, Edit } from "lucide-react";

export default function DeliveryZonesPage() {
  const { toast } = useToast();
  const { data: zonesResult, isLoading } = useDeliveryZones();
  const createZone = useCreateDeliveryZone();
  const updateZone = useUpdateDeliveryZone();
  const deleteZone = useDeleteDeliveryZone();

  const [showDialog, setShowDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    zipCodes: "",
    deliveryFee: "",
    minimumOrder: "",
  });

  const zones = zonesResult?.data ?? [];

  const resetForm = () => {
    setZoneForm({ name: "", zipCodes: "", deliveryFee: "", minimumOrder: "" });
    setEditingZone(null);
  };

  const handleOpenEdit = (zone: any) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      zipCodes: zone.zipCodes.join(", "),
      deliveryFee: zone.deliveryFee.toString(),
      minimumOrder: zone.minimumOrder?.toString() || "",
    });
    setShowDialog(true);
  };

  const handleSaveZone = () => {
    const zipCodes = zoneForm.zipCodes
      .split(",")
      .map((z: string) => z.trim())
      .filter(Boolean);

    if (!zoneForm.name || zipCodes.length === 0 || !zoneForm.deliveryFee) {
      toast({ title: "Name, ZIP codes, and delivery fee are required", variant: "destructive" });
      return;
    }

    const data = {
      name: zoneForm.name,
      zipCodes,
      deliveryFee: parseFloat(zoneForm.deliveryFee),
      minimumOrder: zoneForm.minimumOrder ? parseFloat(zoneForm.minimumOrder) : undefined,
    };

    if (editingZone) {
      updateZone.mutate(
        { id: editingZone.id, ...data },
        {
          onSuccess: () => {
            setShowDialog(false);
            resetForm();
            toast({ title: "Delivery zone updated" });
          },
          onError: (err) => {
            toast({ title: "Failed to update zone", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      createZone.mutate(data, {
        onSuccess: () => {
          setShowDialog(false);
          resetForm();
          toast({ title: "Delivery zone created" });
        },
        onError: (err) => {
          toast({ title: "Failed to create zone", description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDeleteZone = (id: string, name: string) => {
    if (!confirm(`Delete delivery zone "${name}"?`)) return;
    deleteZone.mutate(id, {
      onSuccess: () => toast({ title: `Zone "${name}" deleted` }),
      onError: (err) => {
        toast({ title: "Failed to delete zone", description: err.message, variant: "destructive" });
      },
    });
  };

  const isSaving = createZone.isPending || updateZone.isPending;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Delivery Zones</h1>
          <p className="mt-1 text-muted-foreground">
            Define delivery zones with ZIP codes and fees
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Zone
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Zones
          </CardTitle>
          <CardDescription>
            {zones.length} zone{zones.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No delivery zones configured. Add zones to define delivery areas and fees.
            </p>
          ) : (
            <div className="space-y-3">
              {zones.map((zone: any) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{zone.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      ZIP: {zone.zipCodes.join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fee: ${zone.deliveryFee.toFixed(2)}
                      {zone.minimumOrder != null && ` \u2022 Min order: $${zone.minimumOrder.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(zone)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteZone(zone.id, zone.name)}
                      disabled={deleteZone.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingZone ? "Edit Delivery Zone" : "Add Delivery Zone"}
            </DialogTitle>
            <DialogDescription>
              {editingZone
                ? "Update the delivery zone details"
                : "Define a new delivery zone with ZIP codes and fees"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Zone Name *</Label>
              <Input
                id="zone-name"
                placeholder="e.g., Downtown Area"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-zips">ZIP Codes * (comma-separated)</Label>
              <Input
                id="zone-zips"
                placeholder="e.g., 10001, 10002, 10003"
                value={zoneForm.zipCodes}
                onChange={(e) => setZoneForm({ ...zoneForm, zipCodes: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="zone-fee">Delivery Fee ($) *</Label>
                <Input
                  id="zone-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={zoneForm.deliveryFee}
                  onChange={(e) => setZoneForm({ ...zoneForm, deliveryFee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-min">Minimum Order ($)</Label>
                <Input
                  id="zone-min"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="No minimum"
                  value={zoneForm.minimumOrder}
                  onChange={(e) => setZoneForm({ ...zoneForm, minimumOrder: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveZone} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editingZone ? "Update Zone" : "Add Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
