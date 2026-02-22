"use client";

import { TourProvider } from "@/lib/tour-context";
import { WelcomeModal } from "@/components/tour/welcome-modal";
import { TourOverlay } from "@/components/tour/tour-overlay";

export function TourWrapper({
  audience,
  children,
}: {
  audience: "restaurant" | "supplier";
  children: React.ReactNode;
}) {
  return (
    <TourProvider audience={audience}>
      {children}
      <WelcomeModal />
      <TourOverlay />
    </TourProvider>
  );
}
