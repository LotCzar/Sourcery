"use client";

import { useState } from "react";
import { useReturns, useCreateReturn } from "@/hooks/use-returns";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw,
  Loader2,
  Plus,
} from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  RESOLVED: "bg-green-100 text-green-800",
  CREDIT_ISSUED: "bg-purple-100 text-purple-800",
};

const typeLabels: Record<string, string> = {
  RETURN: "Return",
  QUALITY_ISSUE: "Quality Issue",
  DAMAGED: "Damaged",
  WRONG_ITEM: "Wrong Item",
  SHORT_DELIVERY: "Short Delivery",
};

const returnTypes = [
  { value: "RETURN", label: "Return" },
  { value: "QUALITY_ISSUE", label: "Quality Issue" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "SHORT_DELIVERY", label: "Short Delivery" },
];

export default function ReturnsPage() {
  const { data, isLoading } = useReturns();
  const createReturn = useCreateReturn();

  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  // Form state
  const [orderId, setOrderId] = useState("");
  const [type, setType] = useState("DAMAGED");
  const [reason, setReason] = useState("");

  // Fetch delivered orders for the selector
  const { data: ordersData } = useQuery({
    queryKey: [...queryKeys.orders.all, "delivered"],
    queryFn: () => apiFetch<any>("/api/orders?status=DELIVERED"),
    enabled: createOpen,
  });

  const deliveredOrders = ordersData?.data || [];

  const returns = data?.data || [];
  const filtered = statusFilter === "all"
    ? returns
    : returns.filter((r: any) => r.status === statusFilter);

  async function handleCreate() {
    await createReturn.mutateAsync({
      orderId,
      type,
      reason,
    });
    setCreateOpen(false);
    setOrderId("");
    setType("DAMAGED");
    setReason("");
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Returns & Quality Issues</h1>
          <p className="text-muted-foreground">Track return requests and quality disputes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Return
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Return Request</DialogTitle>
              <DialogDescription>
                Submit a return request for a delivered order.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Order</Label>
                <Select value={orderId} onValueChange={setOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a delivered order" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveredOrders.map((order: any) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber} — {order.supplier?.name || "Supplier"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {returnTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!orderId || !reason || createReturn.isPending}
              >
                {createReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Return
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({returns.length})</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <RotateCcw className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>No return requests found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((ret: any) => (
            <Card
              key={ret.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setSelectedReturn(ret)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{ret.returnNumber}</CardTitle>
                  <Badge className={statusColors[ret.status] || ""}>
                    {ret.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <CardDescription>
                  {ret.order?.supplier?.name} &middot; Order {ret.order?.orderNumber}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline">{typeLabels[ret.type] || ret.type}</Badge>
                    <p className="text-sm text-muted-foreground line-clamp-1">{ret.reason}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {new Date(ret.createdAt).toLocaleDateString()}
                    {ret.creditAmount != null && (
                      <p className="font-medium text-purple-600">
                        Credit: ${ret.creditAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-lg">
          {selectedReturn && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReturn.returnNumber}</DialogTitle>
                <DialogDescription>
                  {selectedReturn.order?.supplier?.name} &middot; Order {selectedReturn.order?.orderNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge className={statusColors[selectedReturn.status] || ""}>
                    {selectedReturn.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline">{typeLabels[selectedReturn.type] || selectedReturn.type}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reason</Label>
                  <p className="text-sm">{selectedReturn.reason}</p>
                </div>
                {selectedReturn.items && selectedReturn.items.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Items</Label>
                    <ul className="text-sm space-y-1">
                      {selectedReturn.items.map((item: any, i: number) => (
                        <li key={i}>
                          {item.productName} x{item.quantity} @ ${item.unitPrice.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedReturn.resolution && (
                  <div>
                    <Label className="text-muted-foreground">Resolution</Label>
                    <p className="text-sm">{selectedReturn.resolution}</p>
                  </div>
                )}
                {selectedReturn.creditAmount != null && (
                  <div>
                    <Label className="text-muted-foreground">Credit Amount</Label>
                    <p className="text-sm font-medium">${selectedReturn.creditAmount.toFixed(2)}</p>
                  </div>
                )}
                {selectedReturn.creditNotes && (
                  <div>
                    <Label className="text-muted-foreground">Credit Notes</Label>
                    <p className="text-sm">{selectedReturn.creditNotes}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Created {new Date(selectedReturn.createdAt).toLocaleString()}
                  {selectedReturn.resolvedAt && (
                    <> &middot; Resolved {new Date(selectedReturn.resolvedAt).toLocaleString()}</>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
