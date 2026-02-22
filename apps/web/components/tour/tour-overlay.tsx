"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTour } from "@/lib/tour-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;

export function TourOverlay() {
  const { isActive, currentStep, totalSteps, currentStepData, nextStep, prevStep, endTour } =
    useTour();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const updatePosition = useCallback(() => {
    if (!currentStepData) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStepData.target);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [currentStepData]);

  // Scroll into view + position on step change
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const el = document.querySelector(currentStepData.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Delay position calculation to let scroll finish
      const timeout = setTimeout(updatePosition, 350);
      return () => clearTimeout(timeout);
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStepData, updatePosition]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isActive) return;

    const onUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, updatePosition]);

  if (!isActive || !currentStepData || !mounted) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  // Compute tooltip position
  const tooltipStyle = getTooltipStyle(targetRect, currentStepData.placement);

  const overlay = (
    <>
      {/* Overlay backdrop pieces - 4 rects around the target */}
      {targetRect ? (
        <>
          {/* Top */}
          <div
            className="fixed inset-x-0 top-0 bg-black/50 transition-all duration-300"
            style={{
              height: Math.max(0, targetRect.top - PADDING),
              zIndex: 10000,
            }}
          />
          {/* Bottom */}
          <div
            className="fixed inset-x-0 bottom-0 bg-black/50 transition-all duration-300"
            style={{
              top: targetRect.top + targetRect.height + PADDING,
              zIndex: 10000,
            }}
          />
          {/* Left */}
          <div
            className="fixed bg-black/50 transition-all duration-300"
            style={{
              top: targetRect.top - PADDING,
              left: 0,
              width: Math.max(0, targetRect.left - PADDING),
              height: targetRect.height + PADDING * 2,
              zIndex: 10000,
            }}
          />
          {/* Right */}
          <div
            className="fixed bg-black/50 transition-all duration-300"
            style={{
              top: targetRect.top - PADDING,
              left: targetRect.left + targetRect.width + PADDING,
              right: 0,
              height: targetRect.height + PADDING * 2,
              zIndex: 10000,
            }}
          />
          {/* Highlight ring */}
          <div
            className="fixed rounded-lg border-2 border-primary transition-all duration-300 pointer-events-none"
            style={{
              top: targetRect.top - PADDING,
              left: targetRect.left - PADDING,
              width: targetRect.width + PADDING * 2,
              height: targetRect.height + PADDING * 2,
              zIndex: 10001,
            }}
          />
        </>
      ) : (
        // No target found — full overlay
        <div
          className="fixed inset-0 bg-black/50"
          style={{ zIndex: 10000 }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed transition-all duration-300"
        style={{
          ...tooltipStyle,
          zIndex: 10002,
        }}
      >
        <Card className="w-80 shadow-xl border-primary/20">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={endTour}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <h3 className="font-semibold text-sm mb-1">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {currentStepData.description}
            </p>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-muted mb-3">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button size="sm" onClick={nextStep}>
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}

function getTooltipStyle(
  rect: Rect | null,
  placement: string
): React.CSSProperties {
  if (!rect) {
    // Center on screen as floating card
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const tooltipWidth = 320; // w-80

  switch (placement) {
    case "bottom":
      return {
        top: rect.top + rect.height + PADDING + TOOLTIP_GAP,
        left: Math.max(
          16,
          Math.min(
            rect.left + rect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )
        ),
      };
    case "top":
      return {
        bottom: window.innerHeight - rect.top + PADDING + TOOLTIP_GAP,
        left: Math.max(
          16,
          Math.min(
            rect.left + rect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )
        ),
      };
    case "right":
      return {
        top: rect.top + rect.height / 2 - 80,
        left: rect.left + rect.width + PADDING + TOOLTIP_GAP,
      };
    case "left":
      return {
        top: rect.top + rect.height / 2 - 80,
        right: window.innerWidth - rect.left + PADDING + TOOLTIP_GAP,
      };
    default:
      return {
        top: rect.top + rect.height + PADDING + TOOLTIP_GAP,
        left: rect.left,
      };
  }
}
