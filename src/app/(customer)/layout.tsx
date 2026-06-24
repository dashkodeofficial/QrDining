import { CustomerBottomNav, CustomerTopNav } from "@/components/customer/bottom-nav";
import { AdminProvider } from "@/components/customer/admin-context";
import { getVerifiedSession } from "@/lib/session";
import { getCurrentStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { ReactNode } from "react";

/**
 * Customer-facing shell — mobile-first app-like layout.
 *
 * Access control: the customer dashboard is only accessible via:
 *   1. A valid QR table session (cookie set by /qr/[token])
 *   2. An authenticated ADMIN staff member
 * Direct URL access without either is blocked.
 */
export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getVerifiedSession();
  const isAdminAccess = !session ? await checkAdminAccess() : false;

  if (!session && !isAdminAccess) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-app-surface px-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
          🔒
        </div>
        <h1 className="mt-6 text-xl font-bold text-app-ink">Access Denied</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          This dashboard is only accessible by scanning the QR code on your table.
          Please scan the QR code to start your order.
        </p>
      </div>
    );
  }

  return (
    <AdminProvider isAdmin={isAdminAccess}>
      <div className="flex min-h-[100dvh] flex-col bg-app-surface">
        <CustomerTopNav />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <CustomerBottomNav />
      </div>
    </AdminProvider>
  );
}

async function checkAdminAccess(): Promise<boolean> {
  const staff = await getCurrentStaff();
  if (!staff) return false;
  return can(staff.role, "waiter.view");
}
