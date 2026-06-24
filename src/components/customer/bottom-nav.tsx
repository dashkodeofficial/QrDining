"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, ShoppingCart, Receipt, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/stores/cart";

const LINKS = [
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Receipt },
];

export function CustomerBottomNav() {
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const hasHydrated = useCart((s) => s._hasHydrated);

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4 pb-safe lg:hidden">
      <div className="mb-3 flex items-center justify-around rounded-2xl border border-border/60 bg-card/95 shadow-lg backdrop-blur-md">
        {LINKS.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-[11px] font-semibold transition-all",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} />
                {l.href === "/cart" && hasHydrated && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </div>
              {l.label}
              {active && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CustomerTopNav() {
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const hasHydrated = useCart((s) => s._hasHydrated);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border/60 bg-card/95 backdrop-blur-md lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-3">
        <Link href="/menu" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <ChefHat className="size-5 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-app-ink">QR Dining</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
                {l.label}
                {l.href === "/cart" && hasHydrated && count > 0 && (
                  <span className="flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
