"use client";

import { useState } from "react";
import { useSupplierReturns, useUpdateSupplierReturn } from "@/hooks/use-supplier-returns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import {
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  DollarSign,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function SupplierReturnsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useSupplierReturns();
  const updateReturn = useUpdateSupplierReturn();

  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNotes, setCreditNotes] = useState("");

  const returns = data?.data || [];
  const filtered = statusFilter === "all"
    ? returns
    : returns.filter((r: any) => r.status === statusFilter);

  async function handleAction(action: string) {
    if (!selectedReturn) return;
    const payload: any = { action };
    if (resolution) payload.resolution = resolution;
    if (action === "issue_credit") {
      if (creditAmount) payload.creditAmount = parseFloat(creditAmount);
      if (creditNotes) payload.creditNotes = creditNotes;
    }
    try {
      await updateReturn.mutateAsync({ id: selectedReturn.id, data: payload });
      const actionLabel = action.replace(/_/g, " ");
      toast({ title: `Return ${actionLabel} successfully` });
      setActionDialog(null);
      setSelectedReturn(null);
      setResolution("");
      setCreditAmount("");
      setCreditNotes("");
    } catch (err: any) {
      toast({
        title: "Failed to process return",
        description: err.message,
        variant: "destructive",
      });
    }
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
      <div>
        <h1 className="text-2xl font-bold">Returns & Quality Issues</h1>
        <p className="text-muted-foreground">Review and process return requests from restaurants</p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All ({returns.length})</TabsTrigger>
          <TabsTrigger value="PENDING">
            Pending ({returns.filter((r: any) => r.status === "PENDING").length})
          </TabsTrigger>
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
                  {ret.order?.restaurant?.name} &middot; Order {ret.order?.orderNumber}
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
      <Dialog open={!!selectedReturn && !actionDialog} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-lg">
          {selectedReturn && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReturn.returnNumber}</DialogTitle>
                <DialogDescription>
                  {selectedReturn.order?.restaurant?.name} &middot; Order {selectedReturn.order?.orderNumber}
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
                {selectedReturn.photoUrls?.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Photo Evidence
                    </Label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {selectedReturn.photoUrls.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={url}
                            alt={`Evidence photo ${i + 1}`}
                            className="h-24 w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
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
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                {selectedReturn.status === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setActionDialog("reject")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button onClick={() => setActionDialog("approve")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </>
                )}
                {selectedReturn.status === "APPROVED" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setActionDialog("issue_credit")}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Issue Credit
                    </Button>
                    <Button onClick={() => setActionDialog("resolve")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Resolve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "approve" && "Approve Return"}
              {actionDialog === "reject" && "Reject Return"}
              {actionDialog === "resolve" && "Resolve Return"}
              {actionDialog === "issue_credit" && "Issue Credit"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(actionDialog === "reject" || actionDialog === "resolve") && (
              <div>
                <Label>Resolution / Notes</Label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Provide details..."
                />
              </div>
            )}
            {actionDialog === "issue_credit" && (
              <>
                <div>
                  <Label>Credit Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Credit Notes</Label>
                  <Textarea
                    value={creditNotes}
                    onChange={(e) => setCreditNotes(e.target.value)}
                    placeholder="Reason for credit..."
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              onClick={() => handleAction(actionDialog!)}
              disabled={updateReturn.isPending}
            >
              {updateReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
