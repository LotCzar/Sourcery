"use client";

import { useEffect, useState, useCallback } from "react";
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
  FileText,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  paidAmount: number | null;
  notes: string | null;
  restaurant: {
    id: string;
    name: string;
  };
  order: {
    id: string;
    orderNumber: string;
  } | null;
}

interface Stats {
  totalOutstanding: number;
  pendingCount: number;
  overdueCount: number;
  paidThisMonth: number;
  paidThisMonthCount: number;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock className="h-3 w-3" />,
  },
  PAID: {
    label: "Paid",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  OVERDUE: {
    label: "Overdue",
    color: "bg-red-100 text-red-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    color: "bg-blue-100 text-blue-700",
    icon: <DollarSign className="h-3 w-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-gray-100 text-gray-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  DISPUTED: {
    label: "Disputed",
    color: "bg-orange-100 text-orange-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOutstanding: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidThisMonth: 0,
    paidThisMonthCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== "ALL") {
        params.append("status", selectedStatus);
      }

      const response = await fetch(`/api/supplier/invoices?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch invoices");
      }

      setInvoices(result.data);
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleAction = async (invoiceId: string, action: string) => {
    setIsActionLoading(true);
    try {
      const response = await fetch(`/api/supplier/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update invoice");
      }

      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsActionLoading(false);
    }
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
    });
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOverdue = (invoice: Invoice) => {
    return (
      invoice.status === "PENDING" && new Date(invoice.dueDate) < new Date()
    );
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
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices for delivered orders
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid This Month
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.paidThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.paidThisMonthCount} invoices collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
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
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground">
              Invoices will be generated when orders are delivered
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{invoice.invoiceNumber}</p>
                        <Badge
                          variant="outline"
                          className={
                            isOverdue(invoice)
                              ? statusConfig.OVERDUE.color
                              : statusConfig[invoice.status]?.color || ""
                          }
                        >
                          {isOverdue(invoice)
                            ? statusConfig.OVERDUE.icon
                            : statusConfig[invoice.status]?.icon}
                          <span className="ml-1">
                            {isOverdue(invoice)
                              ? "Overdue"
                              : statusConfig[invoice.status]?.label ||
                                invoice.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.restaurant.name}
                        {invoice.order && ` • Order ${invoice.order.orderNumber}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(invoice.total)}
                      </p>
                      <p
                        className={`text-xs ${isOverdue(invoice) ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                      >
                        Due: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Details Dialog */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.restaurant.name}
              {selectedInvoice?.order &&
                ` • Order ${selectedInvoice.order.orderNumber}`}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={
                    isOverdue(selectedInvoice)
                      ? statusConfig.OVERDUE.color
                      : statusConfig[selectedInvoice.status]?.color || ""
                  }
                >
                  {isOverdue(selectedInvoice)
                    ? statusConfig.OVERDUE.icon
                    : statusConfig[selectedInvoice.status]?.icon}
                  <span className="ml-1">
                    {isOverdue(selectedInvoice)
                      ? "Overdue"
                      : statusConfig[selectedInvoice.status]?.label ||
                        selectedInvoice.status}
                  </span>
                </Badge>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
                {selectedInvoice.paidAmount !== null && (
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Issue Date</p>
                  <p className="font-medium">
                    {formatDate(selectedInvoice.issueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p
                    className={`font-medium ${isOverdue(selectedInvoice) ? "text-red-600" : ""}`}
                  >
                    {formatDate(selectedInvoice.dueDate)}
                  </p>
                </div>
                {selectedInvoice.paidAt && (
                  <div>
                    <p className="text-muted-foreground">Paid Date</p>
                    <p className="font-medium text-green-600">
                      {formatDate(selectedInvoice.paidAt)}
                    </p>
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedInvoice?.status === "PENDING" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction(selectedInvoice.id, "markOverdue")}
                  disabled={isActionLoading}
                  className="text-red-600"
                >
                  Mark Overdue
                </Button>
                <Button
                  onClick={() => handleAction(selectedInvoice.id, "markPaid")}
                  disabled={isActionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as Paid
                </Button>
              </>
            )}
            {selectedInvoice?.status === "OVERDUE" && (
              <Button
                onClick={() => handleAction(selectedInvoice.id, "markPaid")}
                disabled={isActionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Mark as Paid
              </Button>
            )}
            {selectedInvoice?.status === "PARTIALLY_PAID" && (
              <Button
                onClick={() => handleAction(selectedInvoice.id, "markPaid")}
                disabled={isActionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark Fully Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
