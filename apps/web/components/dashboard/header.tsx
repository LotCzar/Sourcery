"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Sparkles } from "lucide-react";
import { useChat } from "@/lib/chat-context";
import { useNotifications } from "@/hooks/use-notifications";

import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { CartIcon } from "@/components/cart/cart-icon";
import { CartDrawer } from "@/components/cart/cart-drawer";

export function Header() {
  const [cartOpen, setCartOpen] = useState(false);
  const { toggleChat } = useChat();
  const { data: notificationData } = useNotifications();
  const unreadCount = notificationData?.unreadCount || 0;

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

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          title="Heard AI"
        >
          <Sparkles className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
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
