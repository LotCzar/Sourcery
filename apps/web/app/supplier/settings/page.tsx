"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  AlertCircle,
  Building,
  MapPin,
  Truck,
  Save,
  HelpCircle,
  RotateCcw,
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupplierSettings, useUpdateSupplierSettings } from "@/hooks/use-supplier-settings";
import { useSupplierDrivers, useAddDriver, useRemoveDriver } from "@/hooks/use-supplier-drivers";
import { useTour } from "@/lib/tour-context";

const supplierStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending Verification", color: "bg-amber-50 text-amber-700" },
  VERIFIED: { label: "Verified", color: "bg-emerald-50 text-emerald-700" },
  SUSPENDED: { label: "Suspended", color: "bg-red-50 text-red-700" },
  INACTIVE: { label: "Inactive", color: "bg-zinc-100 text-zinc-600" },
};

export default function SupplierSettingsPage() {
  const { toast } = useToast();
  const { data: result, isLoading, error } = useSupplierSettings();
  const updateSettings = useUpdateSupplierSettings();

  const settings = result?.data;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    website: "",
    minimumOrder: "",
    deliveryFee: "",
    leadTimeDays: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || "",
        description: settings.description || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        city: settings.city || "",
        state: settings.state || "",
        zipCode: settings.zipCode || "",
        website: settings.website || "",
        minimumOrder: settings.minimumOrder?.toString() || "",
        deliveryFee: settings.deliveryFee?.toString() || "",
        leadTimeDays: settings.leadTimeDays?.toString() || "1",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    updateSettings.mutate(formData, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully!" });
      },
      onError: (err) => {
        toast({ title: "Failed to save settings", description: err.message, variant: "destructive" });
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

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-600">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your supplier profile and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={supplierStatusConfig[settings.status]?.color || ""}
          >
            {supplierStatusConfig[settings.status]?.label || settings.status}
          </Badge>
          {settings.rating !== null && (
            <Badge variant="outline">
              {settings.rating.toFixed(1)} ({settings.reviewCount} reviews)
            </Badge>
          )}
        </div>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            Your company details visible to restaurants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Business Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of your business..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://..."
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address
          </CardTitle>
          <CardDescription>
            Your business location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Settings
          </CardTitle>
          <CardDescription>
            Configure your ordering and delivery preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
              <Input
                id="minimumOrder"
                type="number"
                placeholder="No minimum"
                value={formData.minimumOrder}
                onChange={(e) =>
                  setFormData({ ...formData, minimumOrder: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
              <Input
                id="deliveryFee"
                type="number"
                placeholder="0"
                value={formData.deliveryFee}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryFee: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="1"
                value={formData.leadTimeDays}
                onChange={(e) =>
                  setFormData({ ...formData, leadTimeDays: e.target.value })
                }
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Lead time is the number of days in advance that orders must be placed.
          </p>
        </CardContent>
      </Card>

      {/* Drivers */}
      <DriversSection />

      {/* Guided Tour */}
      <GuidedTourCard />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function DriversSection() {
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Drivers
              </CardTitle>
              <CardDescription>
                Manage your delivery drivers
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Driver
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
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
    </>
  );
}

function GuidedTourCard() {
  const { resetTour } = useTour();
  const router = useRouter();

  const handleRestart = () => {
    resetTour();
    router.push("/supplier");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Guided Tour
        </CardTitle>
        <CardDescription>
          Take a guided tour of the Supplier Portal features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Restart Tour</p>
            <p className="text-sm text-muted-foreground">
              Walk through all the key features again
            </p>
          </div>
          <Button variant="outline" onClick={handleRestart}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
