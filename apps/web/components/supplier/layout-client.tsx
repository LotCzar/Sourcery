"use client";

import { useState, useCallback } from "react";
import { SupplierSidebar } from "@/components/supplier/sidebar";
import { SupplierHeader } from "@/components/supplier/header";
import { SupplierMobileNav } from "@/components/supplier/mobile-nav";
import { SupplierChatSidebar } from "@/components/supplier/chat-sidebar";
import { Toaster } from "@/components/ui/toaster";

export function SupplierLayoutClient({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Navigation */}
      <SupplierMobileNav />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <SupplierSidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative z-50" style={{ overflow: "visible" }}>
          <SupplierHeader onToggleChat={toggleChat} />
        </div>
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>

      {/* Chat Sidebar */}
      <SupplierChatSidebar open={chatOpen} onOpenChange={setChatOpen} />

      <Toaster />
    </div>
  );
}
