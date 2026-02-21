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
import { Truck, TrendingUp, Package, Zap } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
  userName: string;
}

export function WelcomeStep({ onNext, userName }: WelcomeStepProps) {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Truck className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-3xl">
          Welcome{userName ? `, ${userName}` : ""}!
        </CardTitle>
        <CardDescription className="text-lg">
          Let&apos;s set up your supplier account on Heard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-center text-muted-foreground">
          In just a few steps, you&apos;ll be ready to:
        </p>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">List Your Products</p>
              <p className="text-sm text-muted-foreground">
                Add your products and manage inventory
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Receive Orders</p>
              <p className="text-sm text-muted-foreground">
                Get orders from local restaurants
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium">Grow Your Business</p>
              <p className="text-sm text-muted-foreground">
                Reach more customers and increase sales
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
