"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  size = "md",
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const iconBtn = size === "sm" ? "icon-sm" : "icon";
  return (
    <div className={cn("flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 p-0.5", className)}>
      <Button
        type="button"
        variant="ghost"
        size={iconBtn}
        className="rounded-full hover:bg-primary/10 hover:text-primary"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </Button>
      <span className="w-6 text-center text-sm font-bold tabular-nums">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={iconBtn}
        className="rounded-full hover:bg-primary/10 hover:text-primary"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus />
      </Button>
    </div>
  );
}
