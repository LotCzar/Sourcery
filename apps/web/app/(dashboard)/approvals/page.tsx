"use client";

import { useState } from "react";
import {
  useApprovalRules,
  useCreateApprovalRule,
  useDeleteApprovalRule,
  usePendingApprovals,
  useReviewApproval,
} from "@/hooks/use-approvals";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";

export default function ApprovalsPage() {
  const { data: settingsData } = useSettings();
  const isAdmin = ["OWNER", "MANAGER", "ORG_ADMIN"].includes(settingsData?.data?.user?.role ?? "");

  if (!isAdmin) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">You don&apos;t have permission to manage approvals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Approvals</h1>
        <p className="mt-1 text-muted-foreground">
          Manage approval rules and review pending orders
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ApprovalRulesCard />
        <PendingApprovalsCard />
      </div>
    </div>
  );
}

function ApprovalRulesCard() {
  const { data: rulesResult, isLoading } = useApprovalRules();
  const createRule = useCreateApprovalRule();
  const deleteRule = useDeleteApprovalRule();
  const [showForm, setShowForm] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [requiredRole, setRequiredRole] = useState("MANAGER");
  const { toast } = useToast();

  const rules = rulesResult?.data || [];

  const handleCreate = async () => {
    try {
      await createRule.mutateAsync({
        minAmount: parseFloat(minAmount),
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        requiredRole,
      });
      setShowForm(false);
      setMinAmount("");
      setMaxAmount("");
      setRequiredRole("MANAGER");
      toast({ title: "Approval rule created" });
    } catch (err: any) {
      toast({ title: "Failed to create rule", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Approval Rules
        </CardTitle>
        <CardDescription>
          Configure spending thresholds that require approval before orders are submitted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">
            No approval rules configured. All orders will be submitted directly to suppliers.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Orders ${rule.minAmount.toFixed(2)}
                    {rule.maxAmount ? ` - $${rule.maxAmount.toFixed(2)}` : "+"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requires {rule.requiredRole.toLowerCase()} approval
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRule.mutate(rule.id)}
                  disabled={deleteRule.isPending}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="minAmount">Min Amount ($)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  placeholder="500"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="maxAmount">Max Amount ($, optional)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="No limit"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="requiredRole">Required Role</Label>
              <Select value={requiredRole} onValueChange={setRequiredRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!minAmount || createRule.isPending}>
                {createRule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Rule
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PendingApprovalsCard() {
  const { data: pendingResult, isLoading } = usePendingApprovals();
  const reviewApproval = useReviewApproval();
  const { toast } = useToast();

  const pending = pendingResult?.data || [];

  const handleReview = async (orderId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await reviewApproval.mutateAsync({ orderId, status });
      toast({ title: `Order ${status.toLowerCase()}` });
    } catch (err: any) {
      toast({ title: "Failed to review", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Approvals
          {pending.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {pending.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Orders waiting for your review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No orders pending approval.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((order: any) => (
              <div key={order.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.supplier?.name} &mdash; ${Number(order.total).toFixed(2)}
                    </p>
                    {order.createdBy && (
                      <p className="text-xs text-muted-foreground">
                        Submitted by {order.createdBy.firstName} {order.createdBy.lastName || ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReview(order.id, "APPROVED")}
                    disabled={reviewApproval.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReview(order.id, "REJECTED")}
                    disabled={reviewApproval.isPending}
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
