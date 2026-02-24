"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Building2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/lib/org-context";
import { useUnreadCount } from "@/hooks/use-messages";

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

export function Sidebar() {
  const pathname = usePathname();
  const { isOrgAdmin } = useOrg();
  const { data: unreadResult } = useUnreadCount();
  const unreadCount = unreadResult?.data?.unreadCount || 0;

  const orgNavItem = {
    name: "Organization",
    href: "/org-admin",
    icon: Building2,
  };

  const navItems = isOrgAdmin ? [orgNavItem, ...navigation] : navigation;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="text-lg font-semibold text-foreground">FreshSheet</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-3" data-tour="sidebar-nav">
        {navItems.map((item) => {
          const tourAttr =
            item.name === "Menu Parser"
              ? "sidebar-menu-parser"
              : item.name === "Price Alerts"
                ? "sidebar-price-alerts"
                : item.name === "Settings"
                  ? "sidebar-settings"
                  : undefined;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} data-tour={tourAttr}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-l-2 border-primary bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-foreground" : "text-muted-foreground")} />
                {item.name}
                {item.name === "Orders" && unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-4">
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a href="mailto:support@freshsheet.ai" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
