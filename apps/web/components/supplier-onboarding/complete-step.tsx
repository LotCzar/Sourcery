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
import { CheckCircle, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface CompleteStepProps {
  onFinish: () => void;
}

export function CompleteStep({ onFinish }: CompleteStepProps) {
  useEffect(() => {
    // Fire confetti on mount
    const duration = 2 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#22C55E", "#3B82F6", "#F97316"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#22C55E", "#3B82F6", "#F97316"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <CardTitle className="text-3xl">You&apos;re All Set!</CardTitle>
        <CardDescription className="text-lg">
          Your supplier account is ready to use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground">
          We&apos;ve set up your supplier profile. Here&apos;s what you can do next:
        </p>
        <div className="grid gap-3 text-left">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
              1
            </span>
            <span>Add your products to the catalog</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
              2
            </span>
            <span>Configure your delivery zones</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
              3
            </span>
            <span>Start receiving orders from restaurants</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onFinish} className="w-full" size="lg">
          Go to Supplier Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
