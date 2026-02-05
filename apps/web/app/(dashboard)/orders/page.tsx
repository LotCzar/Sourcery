"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  ShoppingCart,
  Loader2,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  FileText,
  Plus,
  Send,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    unit: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  deliveryDate: string | null;
  deliveredAt: string | null;
  supplier: {
    id: string;
    name: string;
  };
  items: OrderItem[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode; step: number }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    icon: <FileText className="h-4 w-4" />,
    step: 0,
  },
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    icon: <Clock className="h-4 w-4" />,
    step: 1,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    icon: <CheckCircle className="h-4 w-4" />,
    step: 2,
  },
  SHIPPED: {
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-700 border-indigo-300",
    icon: <Truck className="h-4 w-4" />,
    step: 3,
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-green-100 text-green-700 border-green-300",
    icon: <CheckCircle className="h-4 w-4" />,
    step: 4,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-300",
    icon: <XCircle className="h-4 w-4" />,
    step: -1,
  },
};

const statusSteps = ["DRAFT", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "submit" | "cancel" | "delete" | "reorder" | null;
    orderId: string | null;
    orderNumber: string | null;
  }>({ open: false, type: null, orderId: null, orderNumber: null });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch orders");
      }

      setOrders(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderAction = async (
    orderId: string,
    action: "submit" | "cancel" | "delete" | "reorder"
  ) => {
    setActionLoading(orderId);
    setError(null);

    try {
      let response;

      if (action === "delete") {
        response = await fetch(`/api/orders/${orderId}`, {
          method: "DELETE",
        });
      } else if (action === "reorder") {
        response = await fetch(`/api/orders/${orderId}/reorder`, {
          method: "POST",
        });
      } else {
        response = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} order`);
      }

      // Refresh orders
      await fetchOrders();

      // If reorder, expand the new order
      if (action === "reorder" && data.data?.id) {
        setExpandedOrder(data.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, type: null, orderId: null, orderNumber: null });
    }
  };

  const openConfirmDialog = (
    type: "submit" | "cancel" | "delete" | "reorder",
    orderId: string,
    orderNumber: string
  ) => {
    setConfirmDialog({ open: true, type, orderId, orderNumber });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Filter orders
  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  // Count by status
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your supplier orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/products">
              <Package className="mr-2 h-4 w-4" />
              Browse Products
            </Link>
          </Button>
          <Button asChild>
            <Link href="/menu-parser">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          All ({orders.length})
        </Button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter !== status ? config.color : ""}
            >
              {config.icon}
              <span className="ml-1">
                {config.label} ({count})
              </span>
            </Button>
          );
        })}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {filteredOrders.length === 0 ? (
        <Card className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">
              {statusFilter === "all" ? "No orders yet" : `No ${statusConfig[statusFilter]?.label.toLowerCase()} orders`}
            </p>
            <p className="mt-1 text-muted-foreground">
              {statusFilter === "all"
                ? "Use the Menu Parser or Products page to create orders"
                : "Try changing the filter to see other orders"}
            </p>
            {statusFilter === "all" && (
              <Button className="mt-4" asChild>
                <Link href="/menu-parser">Go to Menu Parser</Link>
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const isActionLoading = actionLoading === order.id;
            const currentStep = statusConfig[order.status]?.step || 0;

            return (
              <Card key={order.id} className={order.status === "CANCELLED" ? "opacity-75" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {order.orderNumber}
                        <Badge
                          variant="outline"
                          className={statusConfig[order.status]?.color || "bg-gray-100"}
                        >
                          {statusConfig[order.status]?.icon}
                          <span className="ml-1">
                            {statusConfig[order.status]?.label || order.status}
                          </span>
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <Link
                          href={`/suppliers/${order.supplier.id}`}
                          className="hover:underline"
                        >
                          {order.supplier.name}
                        </Link>
                        {" • "}
                        {formatDate(order.createdAt)}
                      </CardDescription>
                      {order.deliveryDate && order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          Expected: {formatShortDate(order.deliveryDate)}
                        </div>
                      )}
                      {order.deliveredAt && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Delivered: {formatShortDate(order.deliveredAt)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">
                        ${Number(order.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} item(s)
                      </p>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  {order.status !== "CANCELLED" && (
                    <div className="mt-4 flex items-center gap-1">
                      {statusSteps.map((step, idx) => {
                        const stepConfig = statusConfig[step];
                        const isCompleted = currentStep >= stepConfig.step;
                        const isCurrent = currentStep === stepConfig.step;

                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                                isCompleted
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : isCurrent
                                  ? "border-primary text-primary"
                                  : "border-gray-300 text-gray-400"
                              }`}
                            >
                              {stepConfig.icon}
                            </div>
                            {idx < statusSteps.length - 1 && (
                              <div
                                className={`flex-1 h-1 mx-1 rounded ${
                                  currentStep > stepConfig.step
                                    ? "bg-primary"
                                    : "bg-gray-200"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="mr-1 h-4 w-4" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1 h-4 w-4" />
                          Show Details
                        </>
                      )}
                    </Button>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      {order.status === "DRAFT" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openConfirmDialog("submit", order.id, order.orderNumber)}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-1 h-4 w-4" />
                            )}
                            Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openConfirmDialog("delete", order.id, order.orderNumber)}
                            disabled={isActionLoading}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        </>
                      )}
                      {order.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmDialog("cancel", order.id, order.orderNumber)}
                          disabled={isActionLoading}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                      {["DELIVERED", "CANCELLED"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmDialog("reorder", order.id, order.orderNumber)}
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1 h-4 w-4" />
                          )}
                          Reorder
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.product.name}
                              </TableCell>
                              <TableCell>
                                ${Number(item.unitPrice).toFixed(2)}/
                                {item.product.unit.toLowerCase()}
                              </TableCell>
                              <TableCell>{Number(item.quantity)}</TableCell>
                              <TableCell className="text-right">
                                ${Number(item.subtotal).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="mt-4 flex justify-end border-t pt-4">
                        <div className="space-y-1 text-right">
                          <div className="flex justify-between gap-8">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>${Number(order.subtotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-muted-foreground">Tax:</span>
                            <span>${Number(order.tax).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-8">
                            <span className="text-muted-foreground">Delivery Fee:</span>
                            <span>${Number(order.deliveryFee).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-8 font-semibold text-lg pt-2 border-t">
                            <span>Total:</span>
                            <span>${Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === "submit" && "Submit Order"}
              {confirmDialog.type === "cancel" && "Cancel Order"}
              {confirmDialog.type === "delete" && "Delete Order"}
              {confirmDialog.type === "reorder" && "Reorder"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "submit" && (
                <>
                  Are you sure you want to submit order <strong>{confirmDialog.orderNumber}</strong>?
                  This will send the order to the supplier for processing.
                </>
              )}
              {confirmDialog.type === "cancel" && (
                <>
                  Are you sure you want to cancel order <strong>{confirmDialog.orderNumber}</strong>?
                  This action cannot be undone.
                </>
              )}
              {confirmDialog.type === "delete" && (
                <>
                  Are you sure you want to delete order <strong>{confirmDialog.orderNumber}</strong>?
                  This will permanently remove the draft order.
                </>
              )}
              {confirmDialog.type === "reorder" && (
                <>
                  Create a new draft order with the same items as <strong>{confirmDialog.orderNumber}</strong>?
                  Prices will be updated to current rates.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, type: null, orderId: null, orderNumber: null })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.type === "delete" || confirmDialog.type === "cancel" ? "destructive" : "default"}
              onClick={() => {
                if (confirmDialog.orderId && confirmDialog.type) {
                  handleOrderAction(confirmDialog.orderId, confirmDialog.type);
                }
              }}
              disabled={actionLoading !== null}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {confirmDialog.type === "submit" && "Submit Order"}
              {confirmDialog.type === "cancel" && "Cancel Order"}
              {confirmDialog.type === "delete" && "Delete Order"}
              {confirmDialog.type === "reorder" && "Create New Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
