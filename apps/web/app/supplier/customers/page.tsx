"use client";

import { useState } from "react";
import { useSupplierCustomers } from "@/hooks/use-supplier-portal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  AlertTriangle,
  DollarSign,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Customer {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  orderCount: number;
  totalSpend: number;
  avgOrderValue: number;
  orderFrequency: number;
  firstOrderDate: string;
  lastOrderDate: string;
  atRisk: boolean;
  topProducts: { name: string; quantity: number }[];
}

type SortField = "name" | "orderCount" | "totalSpend" | "avgOrderValue" | "orderFrequency" | "lastOrderDate";
type SortDirection = "asc" | "desc";

export default function SupplierCustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("totalSpend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: result, isLoading, error } = useSupplierCustomers({
    search: debouncedSearch,
    sortBy: sortField === "totalSpend" ? "spend" : sortField === "orderCount" ? "orders" : "lastOrder",
    sortOrder: sortDirection,
  });
  const customers: Customer[] = result?.data ?? [];

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    // Simple debounce with timeout
    clearTimeout((window as any).__customerSearchTimeout);
    (window as any).__customerSearchTimeout = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "orderCount":
        return dir * (a.orderCount - b.orderCount);
      case "totalSpend":
        return dir * (a.totalSpend - b.totalSpend);
      case "avgOrderValue":
        return dir * (a.avgOrderValue - b.avgOrderValue);
      case "orderFrequency":
        return dir * (a.orderFrequency - b.orderFrequency);
      case "lastOrderDate":
        return dir * (new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime());
      default:
        return 0;
    }
  });

  const atRiskCount = customers.filter((c) => c.atRisk).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpend, 0);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage your customer relationships and identify at-risk accounts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{atRiskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">No order in 30+ days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <SortHeader field="name">Name</SortHeader>
                <TableHead>City</TableHead>
                <SortHeader field="orderCount">Orders</SortHeader>
                <SortHeader field="totalSpend">Total Spend</SortHeader>
                <SortHeader field="avgOrderValue">Avg Order</SortHeader>
                <SortHeader field="orderFrequency">Frequency</SortHeader>
                <SortHeader field="lastOrderDate">Last Order</SortHeader>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCustomers.length > 0 ? (
                sortedCustomers.map((customer) => (
                  <>
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedRow(expandedRow === customer.id ? null : customer.id)
                      }
                    >
                      <TableCell>
                        {expandedRow === customer.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.city}{customer.state ? `, ${customer.state}` : ""}
                      </TableCell>
                      <TableCell>{customer.orderCount}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(customer.totalSpend)}</TableCell>
                      <TableCell>{formatCurrency(customer.avgOrderValue)}</TableCell>
                      <TableCell>{customer.orderFrequency.toFixed(1)}/mo</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(customer.lastOrderDate)}
                      </TableCell>
                      <TableCell>
                        {customer.atRisk ? (
                          <Badge variant="destructive">At Risk</Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRow === customer.id && (
                      <TableRow key={`${customer.id}-expanded`}>
                        <TableCell colSpan={9} className="bg-muted/50 p-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Top Products</p>
                            <div className="flex flex-wrap gap-2">
                              {customer.topProducts.map((p) => (
                                <Badge key={p.name} variant="outline">
                                  {p.name} ({p.quantity} units)
                                </Badge>
                              ))}
                              {customer.topProducts.length === 0 && (
                                <span className="text-sm text-muted-foreground">No product data</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {debouncedSearch ? "No customers match your search" : "No customer data available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
