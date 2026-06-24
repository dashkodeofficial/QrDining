"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import type { ActionResult } from "./orders";
import type { ActivityLog } from "@/lib/types/db";

export interface ActivityLogWithStaff extends ActivityLog {
  staff_name?: string | null;
}

export interface PaginatedActivityLogs {
  logs: ActivityLogWithStaff[];
  total: number;
}

export async function getActivityLogs(
  page: number = 1,
  pageSize: number = 50,
): Promise<ActionResult<PaginatedActivityLogs>> {
  const auth = await requireCapability("activity.view");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [queryRes, countRes] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("*, staff(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true }),
  ]);

  if (queryRes.error) return { ok: false, error: "Could not load activity logs." };

  const logs: ActivityLogWithStaff[] = (queryRes.data ?? []).map((r) => ({
    ...r,
    staff_name: (r as any).staff?.full_name ?? null,
  }));

  const total = countRes.count ?? queryRes.count ?? 0;

  return { ok: true, data: { logs, total } };
}
