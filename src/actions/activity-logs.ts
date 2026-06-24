"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import type { ActionResult } from "./orders";
import type { ActivityLog } from "@/lib/types/db";

export async function getActivityLogs(
  limit: number = 100,
): Promise<ActionResult<ActivityLog[]>> {
  const auth = await requireCapability("activity.view");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: "Could not load activity logs." };
  return { ok: true, data: data ?? [] };
}
