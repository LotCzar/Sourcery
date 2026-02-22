"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useTourState, useUpdateTour } from "@/hooks/use-tour";
import {
  restaurantTourSteps,
  supplierTourSteps,
  type TourStep,
} from "@/lib/tour-steps";

interface TourContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | null;
  showWelcome: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  resetTour: () => void;
  dismissWelcome: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

export function TourProvider({
  audience,
  children,
}: {
  audience: "restaurant" | "supplier";
  children: ReactNode;
}) {
  const { data } = useTourState();
  const updateTour = useUpdateTour();

  const steps =
    audience === "supplier" ? supplierTourSteps : restaurantTourSteps;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // On mount: if tour not completed, show welcome
  useEffect(() => {
    if (data && !initialized) {
      const tourData = data.data;
      if (!tourData.tourCompletedAt) {
        setShowWelcome(true);
      }
      setInitialized(true);
    }
  }, [data, initialized]);

  const startTour = useCallback(() => {
    setShowWelcome(false);
    setCurrentStep(0);
    setIsActive(true);
    updateTour.mutate({ action: "advance", step: 0 });
  }, [updateTour]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      updateTour.mutate({ action: "advance", step: next });
    } else {
      // Last step -> complete
      setIsActive(false);
      updateTour.mutate({ action: "complete" });
    }
  }, [currentStep, steps.length, updateTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      updateTour.mutate({ action: "advance", step: prev });
    }
  }, [currentStep, updateTour]);

  const skipTour = useCallback(() => {
    setShowWelcome(false);
    setIsActive(false);
    updateTour.mutate({ action: "complete" });
  }, [updateTour]);

  const endTour = useCallback(() => {
    setIsActive(false);
    updateTour.mutate({ action: "complete" });
  }, [updateTour]);

  const resetTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setShowWelcome(true);
    updateTour.mutate({ action: "reset" });
  }, [updateTour]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: steps.length,
        currentStepData: isActive ? steps[currentStep] ?? null : null,
        showWelcome,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        endTour,
        resetTour,
        dismissWelcome,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
