"use client";

import { SupplierSidebar } from "@/components/supplier/sidebar";
import { SupplierHeader } from "@/components/supplier/header";
import { SupplierMobileNav } from "@/components/supplier/mobile-nav";
import { SupplierChatSidebar } from "@/components/supplier/chat-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { SupplierChatProvider } from "@/lib/supplier-chat-context";

export function SupplierLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SupplierChatProvider>
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
            <SupplierHeader />
          </div>
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>

        {/* Chat Sidebar */}
        <SupplierChatSidebar />

        <Toaster />
      </div>
    </SupplierChatProvider>
  );
}
