"use client";

import { UserButton } from "@clerk/nextjs";
import { Truck } from "lucide-react";

export function DriverHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Truck className="h-4 w-4 text-primary" />
        </div>
        <span className="font-semibold text-foreground">FreshSheet</span>
      </div>

      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
          },
        }}
        afterSignOutUrl="/login"
      />
    </header>
  );
}
