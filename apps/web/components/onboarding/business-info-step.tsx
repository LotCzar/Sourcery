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
import type { OnboardingData } from "@/app/onboarding/page";
import { ArrowLeft, ArrowRight, ChefHat } from "lucide-react";

interface BusinessInfoStepProps {
  data: OnboardingData;
  updateData: (fields: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const cuisineTypes = [
  "American",
  "Italian",
  "Mexican",
  "Chinese",
  "Japanese",
  "Indian",
  "Thai",
  "French",
  "Mediterranean",
  "Korean",
  "Vietnamese",
  "Caribbean",
  "Soul Food",
  "Fusion",
  "Other",
];

export function BusinessInfoStep({
  data,
  updateData,
  onNext,
  onBack,
}: BusinessInfoStepProps) {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <ChefHat className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Business Info</CardTitle>
        <CardDescription>
          Help us understand your business better
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cuisineType">Cuisine Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {cuisineTypes.map((cuisine) => (
              <button
                key={cuisine}
                type="button"
                onClick={() => updateData({ cuisineType: cuisine })}
                className={`rounded-lg border p-2 text-sm transition-colors ${
                  data.cuisineType === cuisine
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seatingCapacity">Seating Capacity</Label>
          <div className="grid grid-cols-4 gap-2">
            {["1-25", "26-50", "51-100", "100+"].map((capacity) => (
              <button
                key={capacity}
                type="button"
                onClick={() => updateData({ seatingCapacity: capacity })}
                className={`rounded-lg border p-3 text-sm transition-colors ${
                  data.seatingCapacity === capacity
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {capacity}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            This helps us recommend appropriate order sizes
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
