"use client";

import { Building2, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { useOrg } from "@/lib/org-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RestaurantSwitcher() {
  const {
    activeRestaurantId,
    activeRestaurantName,
    availableRestaurants,
    isOrgAdmin,
    switchRestaurant,
  } = useOrg();

  if (!isOrgAdmin || availableRestaurants.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {activeRestaurantName || "Select Restaurant"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Restaurant</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRestaurants.map((restaurant) => (
          <DropdownMenuItem
            key={restaurant.id}
            onClick={() => switchRestaurant(restaurant.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{restaurant.name}</span>
            {restaurant.id === activeRestaurantId && (
              <Check className="h-4 w-4 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/org-admin" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            View All Restaurants
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
