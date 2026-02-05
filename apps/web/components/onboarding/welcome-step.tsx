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
import { Sparkles, TrendingUp, Users, Zap } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
  userName: string;
}

export function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Sparkles className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-3xl">
          Welcome{userName ? `, ${userName}` : ""}!
        </CardTitle>
        <CardDescription className="text-lg">
          Let&apos;s set up your restaurant on Sourcery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-center text-muted-foreground">
          In just a few steps, you&apos;ll be ready to:
        </p>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Connect with Suppliers</p>
              <p className="text-sm text-muted-foreground">
                Find verified suppliers in your area
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Compare Prices</p>
              <p className="text-sm text-muted-foreground">
                Get the best deals on ingredients
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium">AI-Powered Ordering</p>
              <p className="text-sm text-muted-foreground">
                Smart recommendations and automation
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onNext} className="w-full" size="lg">
          Get Started
        </Button>
      </CardFooter>
    </Card>
  );
}
