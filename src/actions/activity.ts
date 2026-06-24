"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth";

/**
 * Write a staff activity log entry. Best-effort: failures are swallowed so
 * they don't break user-facing actions.
 */
export async function logActivity(
  action: string,
  details: Record<string, unknown> = {},
  entityId?: string,
): Promise<void> {
  const staff = await getCurrentStaff().catch(() => null);
  const supabase = createAdminClient();
  const [entityType] = action.split(".");
  await supabase.from("activity_logs").insert({
    staff_id: staff?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: details,
  });
}
