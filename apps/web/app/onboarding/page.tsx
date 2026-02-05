"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AccountTypeStep } from "@/components/onboarding/account-type-step";
import { WelcomeStep } from "@/components/onboarding/welcome-step";
import { RestaurantDetailsStep } from "@/components/onboarding/restaurant-details-step";
import { BusinessInfoStep } from "@/components/onboarding/business-info-step";
import { PreferencesStep } from "@/components/onboarding/preferences-step";
import { CompleteStep } from "@/components/onboarding/complete-step";

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
  cuisineType: string;
  seatingCapacity: string;
  // Preferences
  deliveryPreference: string;
  orderFrequency: string;
  budgetRange: string;
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
  cuisineType: "",
  seatingCapacity: "",
  deliveryPreference: "",
  orderFrequency: "",
  budgetRange: "",
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user } = useUser();

  const updateData = (fields: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleSelectRestaurant = () => {
    // Continue with restaurant onboarding
    nextStep();
  };

  const handleSelectSupplier = () => {
    // Redirect to supplier onboarding
    router.push("/supplier-onboarding");
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }

      nextStep();
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToDashboard = () => {
    router.push("/");
  };

  const steps = [
    <AccountTypeStep
      key="account-type"
      onSelectRestaurant={handleSelectRestaurant}
      onSelectSupplier={handleSelectSupplier}
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

  // Progress indicator only shows for restaurant steps (after account type selection)
  const showProgress = step > 1 && step < 5;
  const progressStep = step - 1; // Adjust for account type step

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      {/* Progress indicator */}
      {showProgress && (
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 w-16 rounded-full transition-colors ${
                i <= progressStep ? "bg-green-500" : "bg-gray-200"
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
