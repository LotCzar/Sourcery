"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { usePendingApprovals, useReviewApproval } from "@/hooks/use-approvals";

export function PendingApprovals() {
  const { data: result, isLoading } = usePendingApprovals();
  const reviewMutation = useReviewApproval();
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const approvals = result?.data || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) return null;

  const handleReview = async (orderId: string, status: "APPROVED" | "REJECTED") => {
    setReviewingId(orderId);
    try {
      await reviewMutation.mutateAsync({ orderId, status });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Pending Approvals
          <Badge variant="secondary">{approvals.length}</Badge>
        </CardTitle>
        <CardDescription>Orders waiting for your approval</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvals.map((item: any) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{item.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {item.createdBy?.firstName} {item.createdBy?.lastName} &middot;{" "}
                {item.supplier?.name} &middot;{" "}
                ${item.total.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50"
                disabled={reviewingId === item.id}
                onClick={() => handleReview(item.id, "REJECTED")}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
              <Button
                size="sm"
                disabled={reviewingId === item.id}
                onClick={() => handleReview(item.id, "APPROVED")}
              >
                {reviewingId === item.id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1 h-4 w-4" />
                )}
                Approve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
