"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, Truck, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountTypeStepProps {
  onSelectRestaurant: () => void;
  onSelectSupplier: () => void;
  onSelectOrganization?: () => void;
  userName: string;
}

export function AccountTypeStep({
  onSelectRestaurant,
  onSelectSupplier,
  onSelectOrganization,
  userName
}: AccountTypeStepProps) {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-3xl">
          Welcome{userName ? `, ${userName}` : ""}!
        </CardTitle>
        <CardDescription className="text-lg">
          What type of account would you like to create?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <button
          onClick={onSelectRestaurant}
          className={cn(
            "w-full rounded-lg border-2 p-6 text-left transition-all",
            "hover:border-primary hover:bg-primary/5",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Store className="h-6 w-6 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Restaurant</h3>
              <p className="text-sm text-muted-foreground mt-1">
                I want to order supplies from vendors for my restaurant, cafe, or food business.
              </p>
              <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                <li>• Browse and compare suppliers</li>
                <li>• Place and track orders</li>
                <li>• Manage inventory</li>
              </ul>
            </div>
          </div>
        </button>

        <button
          onClick={onSelectSupplier}
          className={cn(
            "w-full rounded-lg border-2 p-6 text-left transition-all",
            "hover:border-primary hover:bg-primary/5",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Truck className="h-6 w-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Supplier</h3>
              <p className="text-sm text-muted-foreground mt-1">
                I want to sell products to restaurants and manage orders from my customers.
              </p>
              <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                <li>• List your products</li>
                <li>• Receive orders from restaurants</li>
                <li>• Manage deliveries and invoices</li>
              </ul>
            </div>
          </div>
        </button>

        {onSelectOrganization && (
          <button
            onClick={onSelectOrganization}
            className={cn(
              "w-full rounded-lg border-2 p-6 text-left transition-all",
              "hover:border-violet-500 hover:bg-violet-50",
              "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50">
                <Building2 className="h-6 w-6 text-violet-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Organization</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  I manage multiple restaurant locations and need centralized oversight.
                </p>
                <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                  <li>• Manage multiple restaurants</li>
                  <li>• Cross-location analytics</li>
                  <li>• Centralized supplier management</li>
                </ul>
              </div>
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
