"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { CartIcon } from "@/components/cart/cart-icon";
import { CartDrawer } from "@/components/cart/cart-drawer";

export function Header() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 relative z-20" style={{ overflow: "visible" }}>
      {/* Search */}
      <div className="flex flex-1 items-center gap-4" style={{ overflow: "visible" }}>
        <GlobalSearch />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 relative z-50">
        <CartIcon onClick={() => setCartOpen(true)} />
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-orange-500" />
        </Button>

        <div className="h-8 w-px bg-border" />

        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-9 w-9",
            },
          }}
          afterSignOutUrl="/login"
        />
      </div>
    </header>
  );
}
