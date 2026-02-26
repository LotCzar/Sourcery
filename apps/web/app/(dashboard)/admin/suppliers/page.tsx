"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Check, X, RotateCcw, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAdminSuppliers, useVerifySupplier } from "@/hooks/use-admin-suppliers";
import { useToast } from "@/hooks/use-toast";

const statusBadgeVariant: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  VERIFIED: "bg-green-100 text-green-800 border-green-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  INACTIVE: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

export default function AdminSuppliersPage() {
  const [tab, setTab] = useState("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectSupplierId, setRejectSupplierId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const statusFilter = tab === "all" ? undefined : tab.toUpperCase();
  const { data: result, isLoading, error } = useAdminSuppliers(statusFilter);
  const verifyMutation = useVerifySupplier();
  const { toast } = useToast();

  const suppliers = result?.data ?? [];

  const handleAction = (supplierId: string, action: string, notes?: string) => {
    verifyMutation.mutate(
      { supplierId, action, notes },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Supplier ${action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "suspend" ? "suspended" : "reactivated"} successfully.`,
          });
          setRejectDialogOpen(false);
          setRejectNotes("");
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update supplier status.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const openRejectDialog = (supplierId: string) => {
    setRejectSupplierId(supplierId);
    setRejectNotes("");
    setRejectDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Supplier Verification</h1>
          <p className="text-sm text-muted-foreground">
            Review and manage supplier applications
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {tab === "all" ? "All Suppliers" : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Suppliers`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Failed to load suppliers. Please try again.
                </div>
              ) : suppliers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No suppliers found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.email}</TableCell>
                        <TableCell>
                          {[supplier.city, supplier.state].filter(Boolean).join(", ") || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusBadgeVariant[supplier.status] || ""}
                          >
                            {supplier.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(supplier.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {supplier.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-200 text-green-700 hover:bg-green-50"
                                  onClick={() => handleAction(supplier.id, "approve")}
                                  disabled={verifyMutation.isPending}
                                >
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-700 hover:bg-red-50"
                                  onClick={() => openRejectDialog(supplier.id)}
                                  disabled={verifyMutation.isPending}
                                >
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {supplier.status === "VERIFIED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => handleAction(supplier.id, "suspend")}
                                disabled={verifyMutation.isPending}
                              >
                                <Ban className="mr-1 h-3.5 w-3.5" />
                                Suspend
                              </Button>
                            )}
                            {supplier.status === "SUSPENDED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-200 text-green-700 hover:bg-green-50"
                                onClick={() => handleAction(supplier.id, "reactivate")}
                                disabled={verifyMutation.isPending}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Supplier</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this supplier application. This will be included in the notification email.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectSupplierId) {
                  handleAction(rejectSupplierId, "reject", rejectNotes || undefined);
                }
              }}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
