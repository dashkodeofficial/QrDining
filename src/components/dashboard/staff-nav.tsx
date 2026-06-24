"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { can, ROLE_LABEL } from "@/lib/permissions";
import type { StaffRole } from "@/lib/types/db";

const LINKS: { href: string; label: string; cap: Parameters<typeof can>[1] }[] = [
  { href: "/admin", label: "Overview", cap: "orders.manage" },
  { href: "/admin/orders", label: "Orders", cap: "orders.manage" },
  { href: "/admin/menu", label: "Menu", cap: "menu.manage" },
  { href: "/admin/tables", label: "Tables", cap: "tables.manage" },
  { href: "/admin/staff", label: "Staff", cap: "staff.manage" },
  { href: "/admin/reports", label: "Reports", cap: "reports.view" },
  { href: "/admin/activity", label: "Activity", cap: "activity.view" },
  { href: "/spin-win/vouchers", label: "Vouchers", cap: "spin.manage" },
  { href: "/spin-win/rewards", label: "Rewards", cap: "spin.manage" },
  { href: "/spin-win/wheel", label: "Spin Wheel", cap: "spin.play" },
  { href: "/admin/settings", label: "Settings", cap: "settings.manage" },
  { href: "/kitchen", label: "Kitchen", cap: "kitchen.view" },
  { href: "/waiter", label: "Waiter", cap: "waiter.view" },
  { href: "/cashier", label: "Cashier", cap: "payments.manage" },
];

export function StaffNav({ role, fullName }: { role: StaffRole; fullName: string }) {
  const pathname = usePathname();
  const visible = LINKS.filter((l) => can(role, l.cap));

  return (
    <div className="flex items-center gap-4">
      <nav className="hidden items-center gap-1 text-sm sm:flex">
        {visible.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors",
              pathname === l.href || pathname.startsWith(l.href + "/")
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <span className="text-sm text-muted-foreground">
        {ROLE_LABEL[role as StaffRole]} · {fullName}
      </span>
    </div>
  );
}
