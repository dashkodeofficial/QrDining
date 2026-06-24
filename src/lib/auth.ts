import "server-only";
import { createServerClientFromCookies } from "@/lib/supabase/server";
import { can, ROLE_HOME, type Capability } from "@/lib/permissions";
import type { Staff, StaffRole } from "@/lib/types/db";

export interface CurrentStaff {
  id: string;
  userId: string;
  fullName: string;
  role: StaffRole;
  active: boolean;
}

/**
 * Resolve the currently authenticated staff member from the Supabase auth
 * cookie. Returns null if the user is not logged in or is not an active staff
 * member.
 */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createServerClientFromCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staff || !staff.active) return null;

  return {
    id: staff.id,
    userId: user.id,
    fullName: staff.full_name,
    role: staff.role,
    active: staff.active,
  };
}

/**
 * Require the current staff to have a specific capability. Returns the staff
 * record on success, or an error message otherwise.
 */
export async function requireCapability(
  cap: Capability,
): Promise<{ ok: true; staff: CurrentStaff } | { ok: false; error: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Please log in as an active staff member." };
  if (!can(staff.role, cap)) return { ok: false, error: "You do not have permission to perform this action." };
  return { ok: true, staff };
}

/**
 * Require any authenticated staff member (no specific capability check).
 * Useful for shared endpoints that do their own fine-grained authorization.
 */
export async function requireAnyStaff(): Promise<CurrentStaff | null> {
  return getCurrentStaff();
}

export { ROLE_HOME, can };
