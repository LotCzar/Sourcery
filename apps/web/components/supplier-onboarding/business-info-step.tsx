"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SupplierOnboardingData } from "@/app/supplier-onboarding/page";
import { ArrowLeft, ArrowRight, Settings } from "lucide-react";

interface BusinessInfoStepProps {
  data: SupplierOnboardingData;
  updateData: (fields: Partial<SupplierOnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function BusinessInfoStep({
  data,
  updateData,
  onNext,
  onBack,
  isSubmitting,
}: BusinessInfoStepProps) {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Settings className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Delivery Settings</CardTitle>
        <CardDescription>
          Configure your ordering and delivery preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="minimumOrder">Minimum Order Amount ($)</Label>
          <Input
            id="minimumOrder"
            type="number"
            placeholder="100"
            value={data.minimumOrder}
            onChange={(e) => updateData({ minimumOrder: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank for no minimum
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
          <Input
            id="deliveryFee"
            type="number"
            placeholder="25"
            value={data.deliveryFee}
            onChange={(e) => updateData({ deliveryFee: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Standard delivery fee for orders
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
          <Input
            id="leadTimeDays"
            type="number"
            placeholder="1"
            value={data.leadTimeDays}
            onChange={(e) => updateData({ leadTimeDays: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            How many days in advance orders need to be placed
          </p>
        </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="font-medium text-sm mb-2">What happens next?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your account will be created with PENDING status</li>
            <li>• You can start adding products immediately</li>
            <li>• Our team will verify your business details</li>
            <li>• Once verified, restaurants can discover and order from you</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isSubmitting}>
          {isSubmitting ? "Creating Account..." : "Complete Setup"}
          {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
