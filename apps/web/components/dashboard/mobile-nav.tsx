"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  Package,
  BarChart3,
  Bell,
  Sparkles,
  BellRing,
  FileText,
  Warehouse,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Suppliers", href: "/suppliers", icon: Users },
  { name: "Menu Parser", href: "/menu-parser", icon: Sparkles },
  { name: "Products", href: "/products", icon: Package },
  { name: "Inventory", href: "/inventory", icon: Warehouse },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Price Alerts", href: "/price-alerts", icon: BellRing },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg">
            {/* Logo */}
            <div className="flex h-16 items-center border-b px-6">
              <Link
                href="/"
                className="flex items-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-lg font-bold text-primary-foreground">
                    H
                  </span>
                </div>
                <span className="text-xl font-bold text-foreground">
                  Heard
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive &&
                          "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
