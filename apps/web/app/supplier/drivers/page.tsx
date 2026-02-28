"use client";

import { useState } from "react";
import { useSupplierDrivers, useAddDriver, useRemoveDriver } from "@/hooks/use-supplier-drivers";
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
import { Truck, Loader2, Plus, Trash2 } from "lucide-react";

export default function DriversPage() {
  const { toast } = useToast();
  const { data: driversResult, isLoading } = useSupplierDrivers();
  const addDriver = useAddDriver();
  const removeDriver = useRemoveDriver();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDriver, setNewDriver] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const drivers = driversResult?.data ?? [];

  const handleAdd = () => {
    if (!newDriver.firstName || !newDriver.email) {
      toast({
        title: "First name and email are required",
        variant: "destructive",
      });
      return;
    }
    addDriver.mutate(newDriver, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewDriver({ firstName: "", lastName: "", email: "", phone: "" });
        toast({ title: "Driver added successfully" });
      },
      onError: (err) => {
        toast({
          title: "Failed to add driver",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleRemove = (id: string, name: string) => {
    removeDriver.mutate(id, {
      onSuccess: () => toast({ title: `${name} removed` }),
      onError: (err) => {
        toast({
          title: "Failed to remove driver",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Drivers</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your delivery drivers
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Drivers
          </CardTitle>
          <CardDescription>
            {drivers.length} driver{drivers.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No drivers added yet. Add drivers to assign them to deliveries.
            </p>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver: any) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {driver.firstName} {driver.lastName || ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {driver.email}
                      {driver.phone && ` - ${driver.phone}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {driver.deliveryCount} deliveries completed
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() =>
                      handleRemove(driver.id, driver.firstName || "Driver")
                    }
                    disabled={removeDriver.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
            <DialogDescription>
              Add a new delivery driver to your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="driver-first">First Name *</Label>
                <Input
                  id="driver-first"
                  value={newDriver.firstName}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-last">Last Name</Label>
                <Input
                  id="driver-last"
                  value={newDriver.lastName}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-email">Email *</Label>
              <Input
                id="driver-email"
                type="email"
                value={newDriver.email}
                onChange={(e) =>
                  setNewDriver({ ...newDriver, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-phone">Phone</Label>
              <Input
                id="driver-phone"
                value={newDriver.phone}
                onChange={(e) =>
                  setNewDriver({ ...newDriver, phone: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addDriver.isPending}>
              {addDriver.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
