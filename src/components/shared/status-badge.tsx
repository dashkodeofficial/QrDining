import { Badge } from "@/components/ui/badge";
import { statusColor } from "@/lib/theme/colors";
import { cn } from "@/lib/utils";

/**
 * Colored badge that maps any status string to its brand color.
 * Used consistently across tables, orders, and kitchen board.
 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const color = statusColor(status);
  return (
    <Badge
      variant="secondary"
      className={cn("rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", className)}
      style={{
        backgroundColor: color + "15",
        color: color,
        borderColor: color + "30",
      }}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
