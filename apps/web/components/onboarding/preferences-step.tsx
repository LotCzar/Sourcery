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
import { Label } from "@/components/ui/label";
import type { OnboardingData } from "@/app/onboarding/page";
import { ArrowLeft, Check, Settings, Loader2 } from "lucide-react";

interface PreferencesStepProps {
  data: OnboardingData;
  updateData: (fields: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function PreferencesStep({
  data,
  updateData,
  onNext,
  onBack,
  isSubmitting,
}: PreferencesStepProps) {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <Settings className="h-6 w-6 text-orange-600" />
        </div>
        <CardTitle className="text-2xl">Your Preferences</CardTitle>
        <CardDescription>
          Customize your Sourcery experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Delivery Preference</Label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { value: "flexible", label: "Flexible", desc: "Any day works for us" },
              { value: "scheduled", label: "Scheduled", desc: "We prefer set delivery days" },
              { value: "asap", label: "ASAP", desc: "We need deliveries quickly" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateData({ deliveryPreference: option.value })}
                className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  data.deliveryPreference === option.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.desc}</p>
                </div>
                {data.deliveryPreference === option.value && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>How often do you order supplies?</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "2-3x per week" },
              { value: "biweekly", label: "Weekly" },
              { value: "monthly", label: "Bi-weekly" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateData({ orderFrequency: option.value })}
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  data.orderFrequency === option.value
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Monthly supply budget</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "small", label: "Under $5,000" },
              { value: "medium", label: "$5,000 - $15,000" },
              { value: "large", label: "$15,000 - $50,000" },
              { value: "enterprise", label: "$50,000+" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateData({ budgetRange: option.value })}
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  data.budgetRange === option.value
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Complete Setup
              <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
