import Link from "next/link";
import { Lock } from "lucide-react";
import { ProBadge } from "@/components/pro-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: "card" | "inline";
  className?: string;
}

export function UpgradePrompt({
  feature,
  description,
  variant = "card",
  className,
}: UpgradePromptProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Lock className="h-3.5 w-3.5" />
        <span>{feature}</span>
        <ProBadge />
        <Link href="/settings" className="text-primary hover:underline font-medium">
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-purple-200 bg-purple-50/30 p-8 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 mb-4">
        <Lock className="h-5 w-5 text-purple-600" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold">{feature}</h3>
        <ProBadge />
      </div>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {description}
        </p>
      )}
      <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
        <Link href="/settings">Upgrade to Professional</Link>
      </Button>
    </div>
  );
}
