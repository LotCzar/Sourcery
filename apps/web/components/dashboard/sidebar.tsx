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
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/lib/org-context";
import { useUnreadCount } from "@/hooks/use-messages";

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

export function Sidebar() {
  const pathname = usePathname();
  const { isOrgAdmin, role } = useOrg();
  const { data: unreadResult } = useUnreadCount();
  const unreadCount = unreadResult?.data?.unreadCount || 0;

  const isAdmin = ["OWNER", "ORG_ADMIN"].includes(role);

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
      <nav className="flex-1 overflow-y-auto px-3 py-3" data-tour="sidebar-nav">
        {isOrgAdmin && (
          <div className="mb-1">
            <NavLink
              item={{ name: "Organization", href: "/org-admin", icon: Building2 }}
              pathname={pathname}
              unreadCount={0}
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
                  <NavLink
                    key={item.name}
                    item={item}
                    pathname={pathname}
                    unreadCount={item.name === "Orders" ? unreadCount : 0}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-4">
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a href="mailto:support@freshsheet.app" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  unreadCount,
}: {
  item: NavItem;
  pathname: string;
  unreadCount: number;
}) {
  const tourAttr =
    item.name === "Menu Scanner"
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
    <Link href={item.href} data-tour={tourAttr}>
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
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </div>
    </Link>
  );
}
