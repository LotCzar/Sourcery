"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/driver", label: "Deliveries", icon: Truck },
  { href: "/driver/settings", label: "Settings", icon: Settings },
];

export function DriverMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/driver"
              ? pathname === "/driver"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
