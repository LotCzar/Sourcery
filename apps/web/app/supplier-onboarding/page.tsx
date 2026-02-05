"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { WelcomeStep } from "@/components/supplier-onboarding/welcome-step";
import { BusinessDetailsStep } from "@/components/supplier-onboarding/business-details-step";
import { BusinessInfoStep } from "@/components/supplier-onboarding/business-info-step";
import { CompleteStep } from "@/components/supplier-onboarding/complete-step";

export interface SupplierOnboardingData {
  companyName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  minimumOrder: string;
  deliveryFee: string;
  leadTimeDays: string;
}

const initialData: SupplierOnboardingData = {
  companyName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  email: "",
  website: "",
  minimumOrder: "",
  deliveryFee: "",
  leadTimeDays: "1",
};

export default function SupplierOnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SupplierOnboardingData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user } = useUser();

  const updateData = (fields: Partial<SupplierOnboardingData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save onboarding data");
      }

      nextStep();
    } catch (error) {
      console.error("Supplier onboarding error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToDashboard = () => {
    // Refresh to invalidate server-side cache, then redirect
    router.refresh();
    router.push("/supplier");
  };

  const steps = [
    <WelcomeStep key="welcome" onNext={nextStep} userName={user?.firstName || ""} />,
    <BusinessDetailsStep
      key="details"
      data={data}
      updateData={updateData}
      onNext={nextStep}
      onBack={prevStep}
    />,
    <BusinessInfoStep
      key="info"
      data={data}
      updateData={updateData}
      onNext={handleComplete}
      onBack={prevStep}
      isSubmitting={isSubmitting}
    />,
    <CompleteStep key="complete" onFinish={goToDashboard} />,
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      {/* Progress indicator */}
      {step > 0 && step < 3 && (
        <div className="mb-8 flex items-center gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 w-16 rounded-full transition-colors ${
                i <= step ? "bg-green-500" : "bg-gray-200"
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
