"use client";

import { useState } from "react";
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupplierInsights, useUpdateInsight } from "@/hooks/use-supplier-portal";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  DEMAND_FORECAST: { label: "Demand", icon: TrendingUp, color: "bg-blue-100 text-blue-800" },
  PRICING_SUGGESTION: { label: "Pricing", icon: DollarSign, color: "bg-green-100 text-green-800" },
  CUSTOMER_HEALTH: { label: "Customers", icon: Users, color: "bg-purple-100 text-purple-800" },
  ANOMALY: { label: "Anomaly", icon: AlertTriangle, color: "bg-amber-100 text-amber-800" },
  ESCALATION: { label: "Escalation", icon: Clock, color: "bg-red-100 text-red-800" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any }> = {
  ACTIVE: { label: "Active", icon: Lightbulb },
  DISMISSED: { label: "Dismissed", icon: XCircle },
  ACTED_ON: { label: "Acted On", icon: CheckCircle },
};

export default function SupplierInsightsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const typeFilter = activeTab === "all" ? undefined : activeTab;
  const { data, isLoading } = useSupplierInsights(typeFilter, statusFilter);
  const updateInsight = useUpdateInsight();

  const insights = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
          <p className="text-sm text-muted-foreground">
            AI-generated recommendations to optimize your business
          </p>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(key)}
            >
              <config.icon className="mr-1.5 h-3.5 w-3.5" />
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="DEMAND_FORECAST">Demand</TabsTrigger>
          <TabsTrigger value="PRICING_SUGGESTION">Pricing</TabsTrigger>
          <TabsTrigger value="CUSTOMER_HEALTH">Customers</TabsTrigger>
          <TabsTrigger value="ANOMALY">Anomalies</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="py-8">
                    <div className="h-4 w-1/3 rounded bg-muted" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : insights.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground">No insights yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI insights are generated automatically based on your business data.
                  Check back after your first week of activity.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {insights.map((insight: any) => {
                const typeConfig = TYPE_CONFIG[insight.type] || TYPE_CONFIG.ANOMALY;
                const TypeIcon = typeConfig.icon;

                return (
                  <Card key={insight.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={typeConfig.color}>
                            <TypeIcon className="mr-1 h-3 w-3" />
                            {typeConfig.label}
                          </Badge>
                          <CardTitle className="text-base">{insight.title}</CardTitle>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {insight.summary}
                      </p>

                      {insight.status === "ACTIVE" && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateInsight.mutate({ id: insight.id, status: "ACTED_ON" })
                            }
                            disabled={updateInsight.isPending}
                          >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                            Mark as Acted On
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateInsight.mutate({ id: insight.id, status: "DISMISSED" })
                            }
                            disabled={updateInsight.isPending}
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
