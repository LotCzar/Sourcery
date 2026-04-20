"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Settings,
  BarChart3,
  Users,
  Users2,
  Tag,
  Lightbulb,
  Warehouse,
  RotateCcw,
  MapPin,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Core",
    items: [
      { name: "Dashboard", href: "/supplier", icon: LayoutDashboard },
      { name: "Orders", href: "/supplier/orders", icon: ShoppingCart },
      { name: "Customers", href: "/supplier/customers", icon: Users },
      { name: "Products", href: "/supplier/products", icon: Package },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Inventory", href: "/supplier/inventory", icon: Warehouse },
      { name: "Invoices", href: "/supplier/invoices", icon: FileText },
      { name: "Returns", href: "/supplier/returns", icon: RotateCcw },
      { name: "Delivery Zones", href: "/supplier/delivery-zones", icon: MapPin },
      { name: "Drivers", href: "/supplier/drivers", icon: Truck },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Analytics", href: "/supplier/analytics", icon: BarChart3 },
      { name: "AI Insights", href: "/supplier/insights", icon: Lightbulb },
      { name: "Promotions", href: "/supplier/promotions", icon: Tag },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "Team", href: "/supplier/team", icon: Users2 },
      { name: "Settings", href: "/supplier/settings", icon: Settings },
    ],
  },
];

const tourMap: Record<string, string> = {
  Orders: "supplier-sidebar-orders",
  Products: "supplier-sidebar-products",
  Inventory: "supplier-sidebar-inventory",
  Invoices: "supplier-sidebar-invoices",
  Returns: "supplier-sidebar-returns",
  Analytics: "supplier-sidebar-analytics",
  "AI Insights": "supplier-sidebar-insights",
  Team: "supplier-sidebar-team",
  Customers: "supplier-sidebar-customers",
  "Delivery Zones": "supplier-sidebar-delivery-zones",
  Drivers: "supplier-sidebar-drivers",
  Promotions: "supplier-sidebar-promotions",
  Settings: "supplier-sidebar-settings",
};

export function SupplierSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/supplier" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">F</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground">FreshSheet</span>
            <span className="text-xs text-muted-foreground">Supplier Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.label} className="mt-4 first:mt-0">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const tourAttr = tourMap[item.name];
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/supplier" && pathname.startsWith(item.href));
                return (
                  <Link key={item.name} href={item.href} data-tour={tourAttr}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium text-muted-foreground">
            Need help?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contact support or check our documentation.
          </p>
          <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
            <a href="mailto:support@freshsheet.app">Get Support</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
