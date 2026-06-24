"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { can, ROLE_LABEL } from "@/lib/permissions";
import type { StaffRole } from "@/lib/types/db";
import {
  LayoutDashboard,
  UtensilsCrossed,
  LayoutGrid,
  Users,
  CookingPot,
  Package,
  BarChart3,
  Settings,
  Activity,
  Bell,
  Banknote,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ElementType;
  cap: Parameters<typeof can>[1];
  exact?: boolean;
  adminOnly?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, cap: "orders.manage" as const, exact: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/kitchen", label: "Kitchen", icon: CookingPot, cap: "kitchen.view" as const },
      { href: "/waiter", label: "Waiter", icon: Bell, cap: "waiter.view" as const },
      { href: "/cashier", label: "Cashier", icon: Banknote, cap: "payments.manage" as const },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, cap: "menu.manage" as const },
      { href: "/admin/tables", label: "Tables", icon: LayoutGrid, cap: "tables.manage" as const },
      { href: "/admin/staff", label: "Staff", icon: Users, cap: "staff.manage" as const },
      { href: "/admin/inventory", label: "Inventory", icon: Package, cap: "menu.manage" as const },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, cap: "reports.view" as const },
      { href: "/admin/activity", label: "Activity", icon: Activity, cap: "activity.view" as const },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings, cap: "settings.manage" as const },
      { href: "/menu", label: "Customer Dashboard", icon: ChefHat, cap: "settings.manage" as const, adminOnly: true },
    ],
  },
];

interface SidebarProps {
  role: StaffRole;
  fullName: string;
}

function NavItem({
  item,
  role,
  collapsed,
  onClick,
}: {
  item: { href: string; label: string; icon: React.ElementType; cap: Parameters<typeof can>[1]; exact?: boolean; adminOnly?: boolean };
  role: StaffRole;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  if (!can(role, item.cap)) return null;
  if (item.adminOnly && role !== "ADMIN") return null;

  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed && "justify-center px-2",
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function SidebarContent({
  role,
  fullName,
  collapsed,
  onCollapse,
  onItemClick,
}: {
  role: StaffRole;
  fullName: string;
  collapsed: boolean;
  onCollapse?: () => void;
  onItemClick?: () => void;
}) {
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(role, i.cap) && (!i.adminOnly || role === "ADMIN")),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className={cn("flex items-center border-b border-sidebar-border px-4 py-4", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ChefHat className="size-5" />
            </div>
            <div className="leading-none">
              <p className="text-sm font-bold text-sidebar-foreground">QR Dining</p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">{ROLE_LABEL[role]}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChefHat className="size-5" />
          </div>
        )}
        {onCollapse && !collapsed && (
          <button
            onClick={onCollapse}
            className="rounded-md p-1 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  role={role}
                  collapsed={collapsed}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className={cn("border-t border-sidebar-border px-3 py-3", collapsed ? "flex justify-center" : "")}>
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{fullName}</p>
                <Badge variant="outline" className="mt-0.5 h-4 text-[9px] px-1 border-sidebar-border text-sidebar-foreground/60">
                  {ROLE_LABEL[role]}
                </Badge>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" title="Sign out" className="rounded-md p-1.5 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        ) : (
          <form action="/auth/signout" method="post">
            <button type="submit" title="Sign out" className="rounded-md p-1.5 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
              <LogOut className="size-4" />
            </button>
          </form>
        )}
      </div>

      {/* Collapse toggle (when expanded) */}
      {onCollapse && collapsed && (
        <button
          onClick={onCollapse}
          className="mx-auto mb-2 flex size-7 items-center justify-center rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}

export function DashboardSidebar({ role, fullName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-sidebar-border transition-all duration-200 shrink-0 sticky top-0 h-screen",
          collapsed ? "w-[60px]" : "w-[240px]",
        )}
      >
        <SidebarContent
          role={role}
          fullName={fullName}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* Mobile top bar trigger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ChefHat className="size-4" />
            </div>
            <span className="text-sm font-semibold">QR Dining</span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{ROLE_LABEL[role]}</Badge>
      </div>

      {/* Mobile sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            role={role}
            fullName={fullName}
            collapsed={false}
            onItemClick={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
