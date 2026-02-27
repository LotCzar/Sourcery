"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AccountTypeStep } from "@/components/onboarding/account-type-step";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { RestaurantDetailsStep } from "@/components/onboarding/restaurant-details-step";
import { BusinessInfoStep } from "@/components/onboarding/business-info-step";
import { PreferencesStep } from "@/components/onboarding/preferences-step";
import { CompleteStep } from "@/components/onboarding/complete-step";
import { OrgDetailsStep } from "@/components/onboarding/org-details-step";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";

export interface OnboardingData {
  // Restaurant Details
  restaurantName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  // Business Info
  cuisineTypes: string[];
  seatingCapacity: string;
  // Preferences
  deliveryPreference: string;
  orderFrequency: string;
  budgetRange: string;
  // Organization
  organizationName: string;
  slug: string;
}

const initialData: OnboardingData = {
  restaurantName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  email: "",
  website: "",
  cuisineTypes: [],
  seatingCapacity: "",
  deliveryPreference: "",
  orderFrequency: "",
  budgetRange: "",
  organizationName: "",
  slug: "",
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountType, setAccountType] = useState<"restaurant" | "organization" | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{
    hasPendingInvite: boolean;
    restaurantName?: string;
    role?: string;
  } | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(true);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const router = useRouter();
  const { user } = useUser();

  // Check for pending invite on mount
  useEffect(() => {
    async function checkInvite() {
      try {
        const res = await fetch("/api/team/check-invite");
        if (res.ok) {
          const result = await res.json();
          setPendingInvite(result.data);
        }
      } catch {
        // Ignore errors, proceed with normal onboarding
      } finally {
        setIsCheckingInvite(false);
      }
    }
    checkInvite();
  }, []);

  const updateData = (fields: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSelectRestaurant = () => {
    setAccountType("restaurant");
    nextStep();
  };

  const handleSelectSupplier = () => {
    router.push("/supplier-onboarding");
  };

  const handleSelectOrganization = () => {
    setAccountType("organization");
    nextStep();
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const url = accountType === "organization"
        ? "/api/onboarding/organization"
        : "/api/onboarding";

      // Trim all string fields to prevent mobile keyboard whitespace issues
      const cleanedData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
      );

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save onboarding data");
      }

      nextStep();
    } catch (error: any) {
      console.error("Onboarding error:", error);
      alert(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async () => {
    setIsAcceptingInvite(true);
    try {
      const res = await fetch("/api/team/accept-invite", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to accept invite");
      }
      router.push("/");
    } catch (error) {
      console.error("Accept invite error:", error);
      alert("Something went wrong accepting the invite. Please try again.");
    } finally {
      setIsAcceptingInvite(false);
    }
  };

  const goToDashboard = () => {
    router.push("/");
  };

  // Show loading while checking invite
  if (isCheckingInvite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show invite acceptance card
  if (pendingInvite?.hasPendingInvite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <div className="w-full max-w-lg">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <Users className="h-6 w-6 text-emerald-700" />
              </div>
              <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
              <CardDescription className="text-lg">
                You&apos;ve been invited to join{" "}
                <strong>{pendingInvite.restaurantName}</strong> as a{" "}
                {pendingInvite.role?.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Button
                className="w-full"
                onClick={handleAcceptInvite}
                disabled={isAcceptingInvite}
              >
                {isAcceptingInvite && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Accept Invitation
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPendingInvite({ hasPendingInvite: false })}
              >
                Create a new account instead
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Build steps based on account type
  const orgSteps = [
    <AccountTypeStep
      key="account-type"
      onSelectRestaurant={handleSelectRestaurant}
      onSelectSupplier={handleSelectSupplier}
      onSelectOrganization={handleSelectOrganization}
      userName={user?.firstName || ""}
    />,
    <OrgDetailsStep
      key="org-details"
      data={data}
      updateData={updateData}
      onNext={nextStep}
      onBack={prevStep}
    />,
    <RestaurantDetailsStep
      key="details"
      data={data}
      updateData={updateData}
      onNext={nextStep}
      onBack={prevStep}
    />,
    <BusinessInfoStep
      key="business"
      data={data}
      updateData={updateData}
      onNext={nextStep}
      onBack={prevStep}
    />,
    <PreferencesStep
      key="preferences"
      data={data}
      updateData={updateData}
      onNext={handleComplete}
      onBack={prevStep}
      isSubmitting={isSubmitting}
    />,
    <CompleteStep key="complete" onFinish={goToDashboard} />,
  ];

  const restaurantSteps = [
    <AccountTypeStep
      key="account-type"
      onSelectRestaurant={handleSelectRestaurant}
      onSelectSupplier={handleSelectSupplier}
      onSelectOrganization={handleSelectOrganization}
      userName={user?.firstName || ""}
    />,
    <WelcomeStep key="welcome" onNext={nextStep} userName={user?.firstName || ""} />,
    <RestaurantDetailsStep
      key="details"
      data={data}
      updateData={updateData}
      onNext={nextStep}
      onBack={prevStep}
    />,
    <BusinessInfoStep
      key="business"
      data={data}
      updateData={updateData}
      onNext={nextStep}
      onBack={prevStep}
    />,
    <PreferencesStep
      key="preferences"
      data={data}
      updateData={updateData}
      onNext={handleComplete}
      onBack={prevStep}
      isSubmitting={isSubmitting}
    />,
    <CompleteStep key="complete" onFinish={goToDashboard} />,
  ];

  const steps = accountType === "organization" ? orgSteps : restaurantSteps;

  // Progress indicator
  const isOrg = accountType === "organization";
  const totalProgressSteps = isOrg ? 4 : 3;
  const showProgress = isOrg
    ? step > 0 && step < orgSteps.length - 1
    : step > 1 && step < restaurantSteps.length - 1;
  const progressStep = isOrg ? step : step - 1;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
      {/* Progress indicator */}
      {showProgress && (
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: totalProgressSteps }, (_, i) => i + 1).map((i) => (
            <div
              key={i}
              className={`h-2 w-16 rounded-full transition-colors ${
                i <= progressStep ? "bg-primary" : "bg-zinc-200"
              }`}
            />
          ))}
        </div>
      )}

      {/* Current step */}
      <div className="w-full max-w-lg">{steps[step]}</div>
    </div>
  );
}
