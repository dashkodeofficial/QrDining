import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerClientFromCookies } from "@/lib/supabase/server";
import { ROLE_HOME, can, type Capability } from "@/lib/permissions";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import type { StaffRole } from "@/lib/types/db";
import type { ReactNode } from "react";

/**
 * Maps URL path prefixes to the capability required to view them.
 * Used by the dashboard guard to redirect unauthorized staff.
 */
const ROUTE_CAPABILITIES: { prefix: string; cap: Capability }[] = [
  { prefix: "/admin/menu", cap: "menu.manage" },
  { prefix: "/admin/tables", cap: "tables.manage" },
  { prefix: "/admin/staff", cap: "staff.manage" },
  { prefix: "/admin/inventory", cap: "menu.manage" },
  { prefix: "/admin/settings", cap: "settings.manage" },
  { prefix: "/admin/reports", cap: "reports.view" },
  { prefix: "/admin", cap: "orders.manage" },
  { prefix: "/kitchen", cap: "kitchen.view" },
  { prefix: "/waiter", cap: "waiter.view" },
  { prefix: "/cashier", cap: "payments.manage" },
];

/**
 * Dashboard guard — wraps all /admin/*, /kitchen/* etc. routes.
 *
 * Redirects to /login if no authenticated session, and to the correct
 * role home if someone tries to access a route outside their permissions.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerClientFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff || !staff.active) {
    // Authenticated but not a staff member — redirect to login.
    redirect("/login");
  }

  const role = staff.role as StaffRole;

  // Role-based route guard: if the current path requires a capability the
  // staff role does not have, redirect to their role home.
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "/";
  const required = ROUTE_CAPABILITIES.find((r) => pathname.startsWith(r.prefix));
  if (required && !can(role, required.cap)) {
    redirect(ROLE_HOME[role]);
  }

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <DashboardSidebar role={role} fullName={staff.full_name} />
      {/* Main content — offset on mobile for the fixed top bar */}
      <div className="flex flex-1 flex-col min-w-0 pt-14 lg:pt-0">
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
