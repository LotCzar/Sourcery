"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  ShoppingCart,
  Search,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Package,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupplierOrders, useUpdateSupplierOrder } from "@/hooks/use-supplier-orders";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    category: string;
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
  discount: number;
  total: number;
  deliveryDate: string | null;
  deliveryNotes: string | null;
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phone: string | null;
    email: string | null;
  };
  items: OrderItem[];
  _count: {
    items: number;
  };
  createdAt: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700",
    icon: <FileText className="h-3 w-3" />,
  },
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock className="h-3 w-3" />,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  SHIPPED: {
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-700",
    icon: <Truck className="h-3 w-3" />,
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const statusActions: Record<string, { action: string; label: string; color: string }[]> = {
  PENDING: [
    { action: "confirm", label: "Confirm Order", color: "bg-blue-600 hover:bg-blue-700" },
    { action: "reject", label: "Reject", color: "bg-red-600 hover:bg-red-700" },
  ],
  CONFIRMED: [
    { action: "ship", label: "Mark as Shipped", color: "bg-indigo-600 hover:bg-indigo-700" },
  ],
  SHIPPED: [
    { action: "deliver", label: "Mark as Delivered", color: "bg-green-600 hover:bg-green-700" },
  ],
};

export default function SupplierOrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: result, isLoading, error } = useSupplierOrders(selectedStatus);
  const updateOrder = useUpdateSupplierOrder();

  const orders: Order[] = result?.data ?? [];

  const handleAction = async (orderId: string, action: string) => {
    updateOrder.mutate(
      { id: orderId, action },
      {
        onSuccess: () => {
          setSelectedOrder(null);
          toast({ title: `Order ${action}ed successfully` });
        },
        onError: (err) => {
          toast({ title: "Failed to update order", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">
            Manage incoming orders from restaurants
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders or restaurants..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No orders found</p>
            <p className="text-sm text-muted-foreground">
              Orders will appear here when restaurants place them
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{order.orderNumber}</p>
                        <Badge
                          variant="outline"
                          className={statusConfig[order.status]?.color || ""}
                        >
                          {statusConfig[order.status]?.icon}
                          <span className="ml-1">
                            {statusConfig[order.status]?.label || order.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.restaurant.name} • {order._count.items} items
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(order.total)}
                      </p>
                      {order.deliveryDate && (
                        <p className="text-xs text-muted-foreground">
                          Deliver by: {new Date(order.deliveryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {statusActions[order.status] && (
                      <div className="flex gap-2">
                        {statusActions[order.status].map((action) => (
                          <Button
                            key={action.action}
                            size="sm"
                            className={action.color}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(order.id, action.action);
                            }}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Order {selectedOrder.orderNumber}
                  <Badge
                    variant="outline"
                    className={statusConfig[selectedOrder.status]?.color || ""}
                  >
                    {statusConfig[selectedOrder.status]?.icon}
                    <span className="ml-1">
                      {statusConfig[selectedOrder.status]?.label ||
                        selectedOrder.status}
                    </span>
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Placed on {formatDate(selectedOrder.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Restaurant Info */}
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">Restaurant</h3>
                  <p className="font-medium">{selectedOrder.restaurant.name}</p>
                  {selectedOrder.restaurant.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {selectedOrder.restaurant.address},{" "}
                      {selectedOrder.restaurant.city},{" "}
                      {selectedOrder.restaurant.state}{" "}
                      {selectedOrder.restaurant.zipCode}
                    </p>
                  )}
                  {selectedOrder.restaurant.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {selectedOrder.restaurant.phone}
                    </p>
                  )}
                  {selectedOrder.restaurant.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {selectedOrder.restaurant.email}
                    </p>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.product.category.replace("_", " ")} •{" "}
                            {item.quantity} {item.product.unit.toLowerCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(item.subtotal)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @ {formatCurrency(item.unitPrice)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="rounded-lg border p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(selectedOrder.tax)}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.deliveryNotes && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-2">Delivery Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.deliveryNotes}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                {statusActions[selectedOrder.status] && (
                  <div className="flex gap-2">
                    {statusActions[selectedOrder.status].map((action) => (
                      <Button
                        key={action.action}
                        className={action.color}
                        onClick={() =>
                          handleAction(selectedOrder.id, action.action)
                        }
                        disabled={updateOrder.isPending}
                      >
                        {updateOrder.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
