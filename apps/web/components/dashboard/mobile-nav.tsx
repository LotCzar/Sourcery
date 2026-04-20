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
  Sparkles,
  BellRing,
  FileText,
  Warehouse,
  Building2,
  UtensilsCrossed,
  ShieldCheck,
  RotateCcw,
  Tag,
  Plug,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/lib/org-context";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Core",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Orders", href: "/orders", icon: ShoppingCart },
      { name: "Products", href: "/products", icon: Package },
      { name: "Suppliers", href: "/suppliers", icon: Users },
    ],
  },
  {
    label: "Kitchen",
    items: [
      { name: "Menu & Costs", href: "/menu", icon: UtensilsCrossed },
      { name: "Menu Scanner", href: "/menu-parser", icon: Sparkles, adminOnly: true },
      { name: "Inventory", href: "/inventory", icon: Warehouse },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Invoices", href: "/invoices", icon: FileText },
      { name: "Returns", href: "/returns", icon: RotateCcw },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Price Alerts", href: "/price-alerts", icon: BellRing },
    ],
  },
  {
    label: "Admin",
    items: [
      { name: "Team", href: "/team", icon: Users, adminOnly: true },
      { name: "Approvals", href: "/approvals", icon: ShieldCheck, adminOnly: true },
      { name: "Promotions", href: "/promotions", icon: Tag },
      { name: "Integrations", href: "/integrations", icon: Plug, adminOnly: true },
      { name: "Verification", href: "/admin/suppliers", icon: ShieldCheck, adminOnly: true },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { role, isOrgAdmin } = useOrg();

  const isAdmin = ["OWNER", "MANAGER", "ORG_ADMIN"].includes(role);

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
          <div className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-card shadow-lg">
            {/* Logo */}
            <div className="flex h-16 items-center border-b px-6">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">
                    F
                  </span>
                </div>
                <span className="text-lg font-semibold text-foreground">
                  FreshSheet
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="px-3 py-3">
              {isOrgAdmin && (
                <div className="mb-1">
                  <MobileNavLink
                    item={{ name: "Organization", href: "/org-admin", icon: Building2 }}
                    pathname={pathname}
                    onClose={() => setIsOpen(false)}
                  />
                </div>
              )}
              {navSections.map((section) => {
                const visibleItems = section.items.filter(
                  (item) => !item.adminOnly || isAdmin
                );
                if (visibleItems.length === 0) return null;
                return (
                  <div key={section.label} className="mt-4 first:mt-0">
                    <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => (
                        <MobileNavLink
                          key={item.name}
                          item={item}
                          pathname={pathname}
                          onClose={() => setIsOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

function MobileNavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <Link href={item.href} onClick={onClose}>
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
      </div>
    </Link>
  );
}
