"use client";

import { useEffect, useState } from "react";
import {
  useIntegration,
  useConnectIntegration,
  useDisconnectIntegration,
  useSyncMenuItems,
} from "@/hooks/use-integration";
import {
  useAccountingIntegration,
  useAccountingMappings,
  useUpdateMappings,
  useSyncInvoices,
} from "@/hooks/use-accounting";
import { useSettings } from "@/hooks/use-settings";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plug,
  DollarSign,
  Loader2,
  RefreshCw,
  Unplug,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

const PRODUCT_CATEGORIES = [
  "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "BAKERY",
  "BEVERAGES", "DRY_GOODS", "FROZEN", "CLEANING",
  "EQUIPMENT", "OTHER",
];

export default function IntegrationsPage() {
  const { data: settingsData } = useSettings();
  const isAdmin = ["OWNER", "MANAGER", "ORG_ADMIN"].includes(settingsData?.data?.user?.role ?? "");

  if (!isAdmin) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">You don&apos;t have permission to manage integrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
        <p className="mt-1 text-muted-foreground">
          Connect your POS and accounting systems
        </p>
      </div>

      <Tabs defaultValue="pos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pos" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            POS
          </TabsTrigger>
          <TabsTrigger value="accounting" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Accounting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos">
          <POSSection />
        </TabsContent>
        <TabsContent value="accounting">
          <AccountingSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function POSSection() {
  const { data: integrationData, isLoading } = useIntegration();
  const connectIntegration = useConnectIntegration();
  const disconnectIntegration = useDisconnectIntegration();
  const syncMenuItems = useSyncMenuItems();
  const { toast } = useToast();
  const [disconnectDialog, setDisconnectDialog] = useState(false);
  const [toastConnectDialog, setToastConnectDialog] = useState(false);
  const [toastStoreId, setToastStoreId] = useState("");

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>POS Integrations</CardTitle>
          <CardDescription>
            Connect your point-of-sale system for automatic menu syncing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {[
                { key: "SQUARE", name: "Square", letter: "S", bg: "bg-zinc-100", text: "text-zinc-600", desc: "Sync your menu items automatically" },
                { key: "TOAST", name: "Toast", letter: "T", bg: "bg-amber-50", text: "text-amber-700", desc: "Import products and track inventory" },
                { key: "CLOVER", name: "Clover", letter: "C", bg: "bg-emerald-50", text: "text-emerald-700", desc: "Manage orders and inventory" },
                { key: "LIGHTSPEED", name: "Lightspeed", letter: "L", bg: "bg-blue-50", text: "text-blue-700", desc: "Full POS integration for restaurants" },
                { key: "SPOTON", name: "SpotOn", letter: "S", bg: "bg-sky-50", text: "text-sky-700", desc: "Sync menu items from SpotOn Restaurant POS" },
                { key: "MANUAL", name: "Manual", letter: "M", bg: "bg-indigo-50", text: "text-indigo-700", desc: "Track integration status manually" },
              ].map((provider) => {
                const currentIntegration = integrationData?.data;
                const isConnected = currentIntegration?.provider === provider.key && currentIntegration?.isActive;
                const hasOtherConnection = currentIntegration && currentIntegration.provider !== provider.key && currentIntegration.isActive;

                return (
                  <div
                    key={provider.key}
                    className={`flex items-center justify-between rounded-lg border p-4 ${isConnected ? "border-emerald-200 bg-emerald-50/50" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${provider.bg}`}>
                        <span className={`font-bold ${provider.text}`}>{provider.letter}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{provider.name}</p>
                          {isConnected && (
                            <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{provider.desc}</p>
                        {isConnected && currentIntegration?.lastSyncAt && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last synced: {formatDate(currentIntegration.lastSyncAt)}
                          </p>
                        )}
                        {isConnected && currentIntegration?.lastSyncError && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {currentIntegration.lastSyncError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          {provider.key !== "MANUAL" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                syncMenuItems.mutate(undefined, {
                                  onSuccess: () => toast({ title: "Menu sync initiated" }),
                                  onError: (err) => toast({ title: "Sync failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" }),
                                });
                              }}
                              disabled={syncMenuItems.isPending}
                            >
                              {syncMenuItems.isPending ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1 h-3 w-3" />
                              )}
                              Sync
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDisconnectDialog(true)}
                            disabled={disconnectIntegration.isPending}
                          >
                            <Unplug className="mr-1 h-3 w-3" />
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (provider.key === "TOAST") {
                              setToastStoreId("");
                              setToastConnectDialog(true);
                              return;
                            }
                            connectIntegration.mutate(
                              { provider: provider.key },
                              {
                                onSuccess: () => toast({ title: `${provider.name} connected` }),
                                onError: (err) => toast({ title: "Connection failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" }),
                              }
                            );
                          }}
                          disabled={!!hasOtherConnection || connectIntegration.isPending}
                        >
                          {connectIntegration.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Toast Connect Dialog */}
      <Dialog open={toastConnectDialog} onOpenChange={setToastConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Toast POS</DialogTitle>
            <DialogDescription>
              Enter your Toast Restaurant External ID to connect. You can find this in your Toast admin portal under Restaurant Info.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="toast-store-id">Restaurant External ID</Label>
              <Input
                id="toast-store-id"
                placeholder="e.g. abc123-def456-..."
                value={toastStoreId}
                onChange={(e) => setToastStoreId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToastConnectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!toastStoreId.trim()) {
                  toast({ title: "Restaurant External ID is required", variant: "destructive" });
                  return;
                }
                connectIntegration.mutate(
                  { provider: "TOAST", storeId: toastStoreId.trim() },
                  {
                    onSuccess: () => {
                      toast({ title: "Toast connected successfully" });
                      setToastConnectDialog(false);
                    },
                    onError: (err) => toast({ title: "Connection failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" }),
                  }
                );
              }}
              disabled={connectIntegration.isPending}
            >
              {connectIntegration.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Integration Dialog */}
      <Dialog open={disconnectDialog} onOpenChange={setDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unplug className="h-5 w-5" />
              Disconnect Integration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your {integrationData?.data?.provider?.toLowerCase()} integration?
              You can reconnect at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={disconnectIntegration.isPending}
              onClick={() => {
                disconnectIntegration.mutate(undefined, {
                  onSuccess: () => {
                    setDisconnectDialog(false);
                    toast({ title: "Integration disconnected" });
                  },
                  onError: (err) => {
                    toast({
                      title: "Failed to disconnect",
                      description: err instanceof Error ? err.message : undefined,
                      variant: "destructive",
                    });
                  },
                });
              }}
            >
              {disconnectIntegration.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountingSection() {
  const { data: integrationResult, isLoading } = useAccountingIntegration();
  const syncInvoices = useSyncInvoices();
  const { toast } = useToast();

  const integration = integrationResult?.data;

  const handleConnect = (provider: "QUICKBOOKS" | "XERO") => {
    window.location.href = `/api/accounting/connect?provider=${provider.toLowerCase()}`;
  };

  const handleSync = async () => {
    try {
      const result = await syncInvoices.mutateAsync({});
      toast({ title: `Synced ${result?.data?.syncedCount || 0} invoices` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Accounting
        </CardTitle>
        <CardDescription>
          Connect your accounting software for expense tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : integration ? (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${integration.provider === "QUICKBOOKS" ? "bg-emerald-50" : "bg-blue-50"}`}>
                  <span className={`font-bold ${integration.provider === "QUICKBOOKS" ? "text-emerald-700" : "text-blue-700"}`}>
                    {integration.provider === "QUICKBOOKS" ? "QB" : "X"}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{integration.provider === "QUICKBOOKS" ? "QuickBooks" : "Xero"}</p>
                  <p className="text-xs text-muted-foreground">
                    {integration.lastSyncAt
                      ? `Last synced: ${new Date(integration.lastSyncAt).toLocaleDateString()}`
                      : "Never synced"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-700">Connected</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={syncInvoices.isPending}
              >
                {syncInvoices.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Now
              </Button>
            </div>
            <AccountingMappingsSection />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <span className="font-bold text-emerald-700">QB</span>
                </div>
                <div>
                  <p className="font-medium">QuickBooks</p>
                  <p className="text-sm text-muted-foreground">Sync expenses and invoices</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => handleConnect("QUICKBOOKS")}>
                Connect
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <span className="font-bold text-blue-700">X</span>
                </div>
                <div>
                  <p className="font-medium">Xero</p>
                  <p className="text-sm text-muted-foreground">Automated bookkeeping integration</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => handleConnect("XERO")}>
                Connect
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AccountingMappingsSection() {
  const { data: mappingsResult, isLoading } = useAccountingMappings();
  const updateMappings = useUpdateMappings();
  const { toast } = useToast();

  const [localMappings, setLocalMappings] = useState<
    { productCategory: string; accountingCode: string; accountingName: string }[]
  >([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (mappingsResult?.data && !initialized) {
      const existing = mappingsResult.data as {
        productCategory: string;
        accountingCode: string;
        accountingName?: string;
      }[];
      const mapped = PRODUCT_CATEGORIES.map((cat) => {
        const found = existing.find((m) => m.productCategory === cat);
        return {
          productCategory: cat,
          accountingCode: found?.accountingCode || "",
          accountingName: found?.accountingName || "",
        };
      });
      setLocalMappings(mapped);
      setInitialized(true);
    }
  }, [mappingsResult, initialized]);

  const handleSave = async () => {
    const nonEmpty = localMappings.filter((m) => m.accountingCode.trim());
    try {
      await updateMappings.mutateAsync(nonEmpty);
      toast({ title: "Mappings saved" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoading) return null;

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Category Mappings</p>
        <p className="text-xs text-muted-foreground">
          Map product categories to your accounting codes
        </p>
      </div>
      <div className="space-y-2">
        {localMappings.map((mapping, idx) => (
          <div key={mapping.productCategory} className="flex items-center gap-2">
            <span className="w-28 text-xs font-medium truncate">
              {mapping.productCategory.replace("_", " ")}
            </span>
            <Input
              placeholder="Code"
              value={mapping.accountingCode}
              onChange={(e) => {
                const updated = [...localMappings];
                updated[idx] = { ...updated[idx], accountingCode: e.target.value };
                setLocalMappings(updated);
              }}
              className="h-8 text-sm flex-1"
            />
            <Input
              placeholder="Account name"
              value={mapping.accountingName}
              onChange={(e) => {
                const updated = [...localMappings];
                updated[idx] = { ...updated[idx], accountingName: e.target.value };
                setLocalMappings(updated);
              }}
              className="h-8 text-sm flex-1"
            />
          </div>
        ))}
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={updateMappings.isPending}
      >
        {updateMappings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Mappings
      </Button>
    </div>
  );
}
