"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/supplier", icon: LayoutDashboard },
  { name: "Orders", href: "/supplier/orders", icon: ShoppingCart },
  { name: "Products", href: "/supplier/products", icon: Package },
  { name: "Invoices", href: "/supplier/invoices", icon: FileText },
  { name: "Settings", href: "/supplier/settings", icon: Settings },
];

export function SupplierSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/supplier" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">S</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground">Sourcery</span>
            <span className="text-xs text-muted-foreground">Supplier Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/supplier" && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
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
          <Button variant="outline" size="sm" className="mt-3 w-full">
            Get Support
          </Button>
        </div>
      </div>
    </div>
  );
}
