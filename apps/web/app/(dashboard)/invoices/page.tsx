"use client";

import { useState, useEffect } from "react";
import { useInvoices } from "@/hooks/use-invoices";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { apiFetch } from "@/lib/api";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  Download,
  Eye,
  CreditCard,
  Trash2,
  Calendar,
  Building2,
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
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  fileUrl: string | null;
  supplier: { id: string; name: string; email: string };
  order: { id: string; orderNumber: string; status: string } | null;
  createdAt: string;
}

interface Summary {
  totalPending: number;
  totalPaid: number;
  overdueCount: number;
  totalInvoices: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  PAID: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  PARTIALLY_PAID: { label: "Partial", color: "bg-blue-100 text-blue-700", icon: DollarSign },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-700", icon: FileText },
  DISPUTED: { label: "Disputed", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

const paymentMethods: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  CREDIT_CARD: "Credit Card",
  BANK_TRANSFER: "Bank Transfer",
  ACH: "ACH",
  OTHER: "Other",
};

export default function InvoicesPage() {
  const { data: result, isLoading, error } = useInvoices();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create invoice dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: "",
    supplierId: "",
    subtotal: "",
    tax: "",
    dueDate: "",
    notes: "",
  });

  // Payment dialog
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  // View invoice dialog
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const invoices = (result?.data || []) as Invoice[];
  const summary = (result as any)?.summary as Summary | undefined;

  useEffect(() => {
    apiFetch<any>("/api/search?q=supplier")
      .then((data) => {
        if (data.success && data.data.suppliers) {
          setSuppliers(data.data.suppliers);
        }
      })
      .catch(() => {});
  }, []);

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      setIsCreateOpen(false);
      setNewInvoice({ invoiceNumber: "", supplierId: "", subtotal: "", tax: "", dueDate: "", notes: "" });
    },
    onError: (err: any) => alert(err.message || "Failed to create invoice"),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; [k: string]: any }) =>
      apiFetch(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      setPaymentInvoice(null);
      setPaymentMethod("");
      setPaymentReference("");
    },
    onError: (err: any) => alert(err.message || "Failed to update invoice"),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/invoices/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });

  const handleCreateInvoice = () => {
    if (!newInvoice.invoiceNumber || !newInvoice.supplierId || !newInvoice.subtotal || !newInvoice.dueDate) {
      alert("Please fill in all required fields");
      return;
    }
    createInvoiceMutation.mutate({
      invoiceNumber: newInvoice.invoiceNumber,
      supplierId: newInvoice.supplierId,
      subtotal: parseFloat(newInvoice.subtotal),
      tax: newInvoice.tax ? parseFloat(newInvoice.tax) : 0,
      dueDate: newInvoice.dueDate,
      notes: newInvoice.notes || null,
    });
  };

  const handleMarkAsPaid = () => {
    if (!paymentInvoice || !paymentMethod) return;
    markPaidMutation.mutate({
      id: paymentInvoice.id,
      status: "PAID",
      paymentMethod,
      paymentReference: paymentReference || null,
    });
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    deleteInvoiceMutation.mutate(invoiceId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter invoices by search
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.supplier.name.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Track and manage supplier invoices
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Invoice</DialogTitle>
              <DialogDescription>
                Record a new invoice from a supplier
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Number *</label>
                  <Input
                    placeholder="INV-001"
                    value={newInvoice.invoiceNumber}
                    onChange={(e) =>
                      setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier *</label>
                  <Select
                    value={newInvoice.supplierId}
                    onValueChange={(value) =>
                      setNewInvoice({ ...newInvoice, supplierId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subtotal *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      value={newInvoice.subtotal}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, subtotal: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      value={newInvoice.tax}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, tax: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date *</label>
                <Input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, dueDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Optional notes..."
                  value={newInvoice.notes}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, notes: e.target.value })
                  }
                />
              </div>

              {newInvoice.subtotal && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(parseFloat(newInvoice.subtotal) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>{formatCurrency(parseFloat(newInvoice.tax) || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>
                      {formatCurrency(
                        (parseFloat(newInvoice.subtotal) || 0) +
                          (parseFloat(newInvoice.tax) || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice} disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalPending)}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.overdueCount}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Invoices</h3>
              <p className="text-muted-foreground mb-4">
                {invoices.length === 0
                  ? "Add your first invoice to start tracking payments"
                  : "No invoices match your search"}
              </p>
              {invoices.length === 0 && (
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Invoice
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const config = statusConfig[invoice.status] || statusConfig.PENDING;
                  const StatusIcon = config.icon;
                  const daysUntilDue = getDaysUntilDue(invoice.dueDate);

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                        {invoice.order && (
                          <span className="block text-xs text-muted-foreground">
                            Order: {invoice.order.orderNumber}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {invoice.supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(invoice.dueDate)}</span>
                          {invoice.status === "PENDING" && daysUntilDue <= 7 && daysUntilDue > 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                              {daysUntilDue}d left
                            </Badge>
                          )}
                          {invoice.status === "PENDING" && daysUntilDue <= 0 && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total)}
                        {invoice.paidAmount && invoice.status === "PARTIALLY_PAID" && (
                          <span className="block text-xs text-green-600">
                            Paid: {formatCurrency(invoice.paidAmount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(invoice.status === "PENDING" || invoice.status === "OVERDUE") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPaymentInvoice(invoice)}
                            >
                              <CreditCard className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!paymentInvoice} onOpenChange={() => setPaymentInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Mark invoice {paymentInvoice?.invoiceNumber} as paid
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="text-2xl font-bold">
                  {paymentInvoice && formatCurrency(paymentInvoice.total)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method *</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethods).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Number</label>
              <Input
                placeholder="Check #, confirmation #, etc."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentInvoice(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={!paymentMethod || markPaidMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {markPaidMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>

          {viewInvoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{viewInvoice.invoiceNumber}</p>
                  <p className="text-muted-foreground">{viewInvoice.supplier.name}</p>
                </div>
                <Badge variant="outline" className={statusConfig[viewInvoice.status]?.color}>
                  {statusConfig[viewInvoice.status]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{formatDate(viewInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(viewInvoice.dueDate)}</p>
                </div>
                {viewInvoice.paidAt && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Paid On</p>
                      <p className="font-medium">{formatDate(viewInvoice.paidAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium">
                        {paymentMethods[viewInvoice.paymentMethod || ""] || "-"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(viewInvoice.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(viewInvoice.total)}</span>
                </div>
                {viewInvoice.paidAmount && viewInvoice.paidAmount !== viewInvoice.total && (
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>{formatCurrency(viewInvoice.paidAmount)}</span>
                  </div>
                )}
              </div>

              {viewInvoice.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{viewInvoice.notes}</p>
                </div>
              )}

              {viewInvoice.order && (
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Linked Order</p>
                  <p className="font-medium">{viewInvoice.order.orderNumber}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewInvoice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
