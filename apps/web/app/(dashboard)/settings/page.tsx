"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Building2,
  Bell,
  Shield,
  Loader2,
  Save,
  Check,
  AlertTriangle,
  Phone,
  MapPin,
  Calendar,
  Plug,
  Wrench,
  Database,
  Trash2,
} from "lucide-react";

const cuisineTypes = [
  "American",
  "Italian",
  "Mexican",
  "Chinese",
  "Japanese",
  "Thai",
  "Indian",
  "French",
  "Mediterranean",
  "Vietnamese",
  "Korean",
  "Greek",
  "Spanish",
  "Middle Eastern",
  "Caribbean",
  "Soul Food",
  "Seafood",
  "Steakhouse",
  "Pizza",
  "Burger",
  "Café",
  "Bakery",
  "Other",
];

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const { data: settingsData, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const userSettings = settingsData?.data?.user ?? null;
  const restaurantSettings = settingsData?.data?.restaurant ?? null;
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderUpdates: true,
    priceAlerts: true,
    weeklyReport: true,
  });

  // Form states
  const [profileForm, setProfileForm] = useState({ name: "" });
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    website: "",
    cuisineType: "",
  });

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  // Initialize forms when data loads
  useEffect(() => {
    if (settingsData?.data) {
      const { user, restaurant, preferences: prefs } = settingsData.data;
      setProfileForm({ name: `${user.firstName || ""} ${user.lastName || ""}`.trim() });
      setPreferences(prefs);
      if (restaurant) {
        setRestaurantForm({
          name: restaurant.name || "",
          address: restaurant.address || "",
          city: restaurant.city || "",
          state: restaurant.state || "",
          zipCode: restaurant.zipCode || "",
          phone: restaurant.phone || "",
          website: restaurant.website || "",
          cuisineType: restaurant.cuisineType || "",
        });
      }
    }
  }, [settingsData]);

  const saveSettings = (section: string, data: Record<string, unknown>) => {
    updateSettings.mutate(
      { section, data },
      {
        onSuccess: () => {
          toast({ title: `${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully` });
        },
        onError: (err) => {
          toast({
            title: "Failed to save settings",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleProfileSave = () => {
    saveSettings("profile", profileForm);
  };

  const handleRestaurantSave = () => {
    saveSettings("restaurant", restaurantForm);
  };

  const handlePreferencesSave = () => {
    saveSettings("preferences", preferences);
  };

  const handleSeedTestData = async () => {
    setIsSeeding(true);
    setSeedResult(null);

    try {
      const response = await fetch("/api/seed-test-data", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.details
          ? `${result.error}: ${result.details}`
          : result.error || "Failed to seed test data";
        throw new Error(errorMsg);
      }

      setSeedResult(result.data);
      toast({ title: "Test data seeded successfully!" });
    } catch (err) {
      toast({
        title: "Failed to seed test data",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearTestData = async () => {
    setIsClearing(true);
    setSeedResult(null);

    try {
      const response = await fetch("/api/seed-test-data", {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to clear test data");
      }

      toast({ title: "Test data cleared successfully!" });
    } catch (err) {
      toast({
        title: "Failed to clear test data",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account and restaurant settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {clerkUser?.imageUrl ? (
                  <Image
                    src={clerkUser.imageUrl}
                    alt="Profile"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
                    {userSettings?.firstName?.charAt(0) || userSettings?.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-medium truncate">
                    {userSettings?.firstName && userSettings?.lastName
                      ? `${userSettings.firstName} ${userSettings.lastName}`
                      : "No name set"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{userSettings?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant="outline" className="text-xs">
                    {userSettings?.role}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="text-xs">
                    {userSettings?.createdAt ? formatDate(userSettings.createdAt) : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Overview */}
          {restaurantSettings && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Restaurant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{restaurantSettings.name}</p>
                {restaurantSettings.cuisineType && (
                  <Badge variant="outline" className="text-xs">{restaurantSettings.cuisineType}</Badge>
                )}
                {restaurantSettings.address && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <div>
                      <p>{restaurantSettings.address}</p>
                      <p>
                        {restaurantSettings.city}, {restaurantSettings.state}{" "}
                        {restaurantSettings.zipCode}
                      </p>
                    </div>
                  </div>
                )}
                {restaurantSettings.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {restaurantSettings.phone}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="restaurant" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Restaurant</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Plug className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="developer" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Developer</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, name: e.target.value })
                        }
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={userSettings?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Managed through Clerk
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleProfileSave} disabled={updateSettings.isPending}>
                      {updateSettings.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Shield className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible actions for your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialog(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Restaurant Tab */}
            <TabsContent value="restaurant" className="space-y-6">
              {restaurantSettings ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Restaurant Details</CardTitle>
                    <CardDescription>
                      Manage your restaurant information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="restaurantName">Restaurant Name</Label>
                        <Input
                          id="restaurantName"
                          value={restaurantForm.name}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, name: e.target.value })
                          }
                          placeholder="Restaurant name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cuisineType">Cuisine Type</Label>
                        <Select
                          value={restaurantForm.cuisineType || "none"}
                          onValueChange={(value) =>
                            setRestaurantForm({
                              ...restaurantForm,
                              cuisineType: value === "none" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select cuisine type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select cuisine type</SelectItem>
                            {cuisineTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        value={restaurantForm.address}
                        onChange={(e) =>
                          setRestaurantForm({ ...restaurantForm, address: e.target.value })
                        }
                        placeholder="123 Main St"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={restaurantForm.city}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, city: e.target.value })
                          }
                          placeholder="City"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={restaurantForm.state || "none"}
                          onValueChange={(value) =>
                            setRestaurantForm({
                              ...restaurantForm,
                              state: value === "none" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select state</SelectItem>
                            {usStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          value={restaurantForm.zipCode}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, zipCode: e.target.value })
                          }
                          placeholder="12345"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={restaurantForm.phone}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, phone: e.target.value })
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={restaurantForm.website}
                          onChange={(e) =>
                            setRestaurantForm({ ...restaurantForm, website: e.target.value })
                          }
                          placeholder="https://yourrestaurant.com"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleRestaurantSave}
                        disabled={updateSettings.isPending}
                      >
                        {updateSettings.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Restaurant
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">No restaurant found. Complete onboarding to set up your restaurant.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive email updates about your account
                        </p>
                      </div>
                      <Button
                        variant={preferences.emailNotifications ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            emailNotifications: !preferences.emailNotifications,
                          })
                        }
                      >
                        {preferences.emailNotifications ? "On" : "Off"}
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Order Updates</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when your order status changes
                        </p>
                      </div>
                      <Button
                        variant={preferences.orderUpdates ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            orderUpdates: !preferences.orderUpdates,
                          })
                        }
                      >
                        {preferences.orderUpdates ? "On" : "Off"}
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Price Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified when prices change for your products
                        </p>
                      </div>
                      <Button
                        variant={preferences.priceAlerts ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            priceAlerts: !preferences.priceAlerts,
                          })
                        }
                      >
                        {preferences.priceAlerts ? "On" : "Off"}
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Weekly Report</p>
                        <p className="text-sm text-muted-foreground">
                          Receive a weekly summary of spending and orders
                        </p>
                      </div>
                      <Button
                        variant={preferences.weeklyReport ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            weeklyReport: !preferences.weeklyReport,
                          })
                        }
                      >
                        {preferences.weeklyReport ? "On" : "Off"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handlePreferencesSave}
                      disabled={updateSettings.isPending}
                    >
                      {updateSettings.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>POS Integrations</CardTitle>
                  <CardDescription>
                    Connect your point-of-sale system for automatic menu syncing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <span className="font-bold text-gray-600">S</span>
                      </div>
                      <div>
                        <p className="font-medium">Square</p>
                        <p className="text-sm text-muted-foreground">
                          Sync your menu items automatically
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                        <span className="font-bold text-orange-600">T</span>
                      </div>
                      <div>
                        <p className="font-medium">Toast</p>
                        <p className="text-sm text-muted-foreground">
                          Import products and track inventory
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                        <span className="font-bold text-green-600">C</span>
                      </div>
                      <div>
                        <p className="font-medium">Clover</p>
                        <p className="text-sm text-muted-foreground">
                          Manage orders and inventory
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <span className="font-bold text-blue-600">L</span>
                      </div>
                      <div>
                        <p className="font-medium">Lightspeed</p>
                        <p className="text-sm text-muted-foreground">
                          Full POS integration for restaurants
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accounting</CardTitle>
                  <CardDescription>
                    Connect your accounting software for expense tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                        <span className="font-bold text-green-600">QB</span>
                      </div>
                      <div>
                        <p className="font-medium">QuickBooks</p>
                        <p className="text-sm text-muted-foreground">
                          Sync expenses and invoices
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <span className="font-bold text-blue-600">X</span>
                      </div>
                      <div>
                        <p className="font-medium">Xero</p>
                        <p className="text-sm text-muted-foreground">
                          Automated bookkeeping integration
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Developer Tab */}
            <TabsContent value="developer" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Test Data Management
                  </CardTitle>
                  <CardDescription>
                    Seed sample data to test the application features without requiring real supplier interactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> The seed function creates sample orders, invoices,
                      inventory items, and price alerts for your restaurant. This allows you to
                      test features like reports, inventory tracking, and price monitoring.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Seed Test Data</p>
                        <p className="text-sm text-muted-foreground">
                          Create sample orders, invoices, inventory items, and price alerts
                        </p>
                      </div>
                      <Button
                        onClick={handleSeedTestData}
                        disabled={isSeeding || isClearing}
                      >
                        {isSeeding ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Database className="mr-2 h-4 w-4" />
                        )}
                        Seed Data
                      </Button>
                    </div>

                    {seedResult && (
                      <div className={`rounded-lg border p-4 ${seedResult.errors?.length > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
                        <p className={`font-medium mb-2 ${seedResult.errors?.length > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                          Data Created:
                        </p>
                        <ul className={`text-sm space-y-1 ${seedResult.errors?.length > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                          <li>Orders: {seedResult.orders}</li>
                          <li>Invoices: {seedResult.invoices}</li>
                          <li>Inventory Items: {seedResult.inventoryItems}</li>
                          <li>Price Alerts: {seedResult.priceAlerts}</li>
                          {seedResult.notifications !== undefined && (
                            <li>Notifications: {seedResult.notifications}</li>
                          )}
                          {seedResult.priceHistoryRecords !== undefined && (
                            <li>Price History Records: {seedResult.priceHistoryRecords}</li>
                          )}
                        </ul>
                        {seedResult.errors?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-yellow-300">
                            <p className="font-medium text-yellow-800 mb-1">Errors:</p>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {seedResult.errors.map((err: string, idx: number) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between rounded-lg border border-red-200 p-4">
                      <div>
                        <p className="font-medium text-red-600">Clear Test Data</p>
                        <p className="text-sm text-muted-foreground">
                          Remove all orders, invoices, inventory items, and price alerts for your restaurant
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleClearTestData}
                        disabled={isSeeding || isClearing}
                      >
                        {isClearing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Clear Data
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What Gets Created</CardTitle>
                  <CardDescription>
                    Overview of the sample data that will be generated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="font-medium">Orders (5)</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        <li>Various statuses (Delivered, Shipped, Pending, etc.)</li>
                        <li>Random products from existing suppliers</li>
                        <li>Calculated totals with tax and delivery</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Invoices (2+)</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        <li>Linked to delivered orders</li>
                        <li>Mix of paid, pending, and overdue</li>
                        <li>Realistic amounts and due dates</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Inventory Items (8)</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        <li>Common restaurant ingredients</li>
                        <li>Various categories (Produce, Meat, Dairy, etc.)</li>
                        <li>Par levels for low stock alerts</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">Price Alerts & History</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        <li>Price drop alerts for products</li>
                        <li>30 days of price history data</li>
                        <li>Enables price trend analysis</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account,
              restaurant, orders, and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Please contact support at{" "}
              <a href="mailto:support@heard.app" className="text-primary hover:underline">
                support@heard.app
              </a>{" "}
              to request account deletion.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
