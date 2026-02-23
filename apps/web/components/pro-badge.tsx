import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className }: ProBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500/10 to-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-700",
        className
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      Pro
    </span>
  );
}
