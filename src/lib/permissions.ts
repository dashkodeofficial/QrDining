import type { StaffRole } from "./types/db";

/**
 * Role → capability matrix, centralized so the dashboard guard and any
 * conditional UI stay in sync with the spec.
 *
 * ADMIN     : everything
 * MANAGER   : menu, orders, kitchen/table activity, reports (not owner settings)
 * KITCHEN   : kitchen board only
 * WAITER    : tables, waiter calls, serve, bills
 * CASHIER   : payments, receipts (not menu, not settings)
 */
export type Capability =
  | "menu.manage"
  | "menu.view"
  | "orders.manage"
  | "tables.view"
  | "kitchen.view"
  | "waiter.view"
  | "payments.manage"
  | "reports.view"
  | "activity.view"
  | "staff.manage"
  | "tables.manage"
  | "settings.manage"
  | "spin.manage"
  | "spin.play";

const MATRIX: Record<StaffRole, Capability[]> = {
  ADMIN: [
    "menu.manage", "menu.view", "orders.manage", "tables.view", "tables.manage",
    "kitchen.view", "waiter.view", "payments.manage", "reports.view", "activity.view",
    "staff.manage", "settings.manage", "spin.manage", "spin.play",
  ],
  MANAGER: [
    "menu.manage", "menu.view", "orders.manage", "tables.view", "kitchen.view",
    "waiter.view", "reports.view", "activity.view", "spin.manage", "spin.play",
  ],
  KITCHEN: ["kitchen.view", "orders.manage"],
  WAITER: ["tables.view", "waiter.view", "orders.manage", "spin.play"],
  CASHIER: ["payments.manage", "tables.view"],
};

export function can(role: StaffRole | null | undefined, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(cap) ?? false;
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: "Administrator",
  MANAGER: "Manager",
  KITCHEN: "Kitchen Staff",
  WAITER: "Waiter",
  CASHIER: "Cashier",
};

/** Default landing route for each role after login. */
export const ROLE_HOME: Record<StaffRole, string> = {
  ADMIN: "/admin",
  MANAGER: "/admin",
  KITCHEN: "/kitchen",
  WAITER: "/waiter",
  CASHIER: "/cashier",
};
