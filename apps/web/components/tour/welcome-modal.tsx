"use client";

import { Sparkles, ShoppingCart, BarChart3, Zap, Package, Users, Truck } from "lucide-react";
import { useTour } from "@/lib/tour-context";
import { useTourState } from "@/hooks/use-tour";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function WelcomeModal() {
  const { showWelcome, startTour, skipTour, dismissWelcome } = useTour();
  const { data } = useTourState();

  const audience = data?.data?.audience ?? "restaurant";
  const isSupplier = audience === "supplier";

  const features = isSupplier
    ? [
        {
          icon: ShoppingCart,
          title: "Manage Orders",
          description: "View and fulfill restaurant orders in real-time",
        },
        {
          icon: Package,
          title: "Product Catalog",
          description: "List your products and keep pricing up to date",
        },
        {
          icon: Truck,
          title: "Delivery Tracking",
          description: "Track shipments and manage delivery schedules",
        },
      ]
    : [
        {
          icon: Sparkles,
          title: "AI-Powered Ordering",
          description: "Parse menus and auto-match ingredients to suppliers",
        },
        {
          icon: BarChart3,
          title: "Price Intelligence",
          description: "Track prices across suppliers and get alerted on changes",
        },
        {
          icon: Zap,
          title: "Smart Automation",
          description: "Auto-reorder, low-stock alerts, and AI daily briefings",
        },
      ];

  return (
    <Dialog open={showWelcome} onOpenChange={(open) => { if (!open) dismissWelcome(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            Welcome to FreshSheet{isSupplier ? " Supplier Portal" : ""}!
          </DialogTitle>
          <DialogDescription className="text-base">
            {isSupplier
              ? "Let us show you around the supplier portal so you can start managing orders and products right away."
              : "Let us give you a quick tour so you can get the most out of your sourcing platform."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {features.map((feature) => (
            <div key={feature.title} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{feature.title}</p>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button onClick={startTour} className="flex-1">
            Take a Quick Tour
          </Button>
          <Button variant="outline" onClick={skipTour} className="flex-1">
            Skip for Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
