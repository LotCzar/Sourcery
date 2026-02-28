"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Bell, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSupplierChat } from "@/lib/supplier-chat-context";
import { useNotifications } from "@/hooks/use-notifications";

export function SupplierHeader() {
  const { toggleChat } = useSupplierChat();
  const { data } = useNotifications();
  const unreadCount = data?.unreadCount || 0;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 relative z-20" style={{ overflow: "visible" }}>
      {/* Left side - placeholder for search or title */}
      <div className="flex flex-1 items-center gap-4" style={{ overflow: "visible" }}>
        <h1 className="text-lg font-semibold text-foreground">Supplier Portal</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 relative z-50">
        <Button variant="ghost" size="icon" onClick={toggleChat} title="AI Assistant">
          <Sparkles className="h-5 w-5" />
        </Button>

        <Link href="/supplier/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

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
