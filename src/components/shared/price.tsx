import { cn } from "@/lib/utils";

export function Price({
  cents,
  className,
}: {
  cents: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {new Intl.NumberFormat(process.env.NEXT_PUBLIC_LOCALE ?? "en-PK", {
        style: "currency",
        currency: process.env.NEXT_PUBLIC_CURRENCY_CODE ?? "PKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(cents)}
    </span>
  );
}
