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
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";

interface OrgDetailsStepProps {
  data: OnboardingData;
  updateData: (fields: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OrgDetailsStep({
  data,
  updateData,
  onNext,
  onBack,
}: OrgDetailsStepProps) {
  const isValid = data.organizationName && data.slug;

  const handleNameChange = (name: string) => {
    updateData({
      organizationName: name,
      slug: generateSlug(name),
    });
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
          <Building2 className="h-6 w-6 text-violet-700" />
        </div>
        <CardTitle className="text-2xl">Organization Details</CardTitle>
        <CardDescription>
          Set up your organization to manage multiple restaurants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="organizationName">Organization Name *</Label>
          <Input
            id="organizationName"
            placeholder="e.g., Golden Fork Restaurant Group"
            value={data.organizationName}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug *</Label>
          <Input
            id="slug"
            placeholder="e.g., golden-fork-group"
            value={data.slug}
            onChange={(e) => updateData({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
          />
          <p className="text-xs text-muted-foreground">
            Used in your organization URL. Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
