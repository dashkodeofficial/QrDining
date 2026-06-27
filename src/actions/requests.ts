"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedSession } from "@/lib/session";
import { requireCapability, getCurrentStaff } from "@/lib/auth";
import type { WaiterRequestType } from "@/lib/types/db";
import type { ActionResult } from "./orders";

/**
 * Customer-initiated waiter requests (Call Waiter / Need Water / Need Cutlery
 * / Need Assistance). Validated against the QR session on the server.
 */
export async function createWaiterRequest(
  type: WaiterRequestType,
): Promise<ActionResult> {
  const verified = await getVerifiedSession();
  if (!verified) {
    const staff = await getCurrentStaff();
    if (staff) {
      return { ok: false, error: "Waiter requests are only available from a table QR session." };
    }
    return { ok: false, error: "Session expired — please re-scan the QR code." };
  }

  // Throttle: one pending request of this type per session
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("waiter_requests")
    .select("id")
    .eq("table_session_id", verified.session.id)
    .eq("type", type)
    .neq("status", "RESOLVED")
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "You already have a pending request of this type." };
  }

  const { error } = await supabase.from("waiter_requests").insert({
    table_session_id: verified.session.id,
    table_id: verified.table_id,
    type,
    status: "PENDING",
  });

  if (error) return { ok: false, error: "Could not send request. Try again." };

  // Bill requests also advance the table + session status for staff visibility.
  if (type === "REQUEST_BILL") {
    await Promise.all([
      supabase
        .from("tables")
        .update({ status: "BILL_REQUESTED" })
        .eq("id", verified.table_id),
      supabase
        .from("table_sessions")
        .update({ status: "BILL_REQUESTED" })
        .eq("id", verified.session.id),
    ]);
  }

  revalidatePath(`/orders`);
  revalidatePath(`/waiter`);
  return { ok: true, data: undefined };
}

/**
 * Staff-initiated bill request. Allows waiters to request a bill for a table
 * from the waiter dashboard. Finds the active session for the table and creates
 * a REQUEST_BILL waiter request, then advances table + session status.
 */
export async function createStaffBillRequest(
  tableId: string,
): Promise<ActionResult> {
  const auth = await requireCapability("waiter.view");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  // Find the most recent active session for this table.
  const { data: session } = await supabase
    .from("table_sessions")
    .select("id, table_id")
    .eq("table_id", tableId)
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { ok: false, error: "No active session for this table." };

  // Throttle: one pending bill request per session
  const { data: existing } = await supabase
    .from("waiter_requests")
    .select("id")
    .eq("table_session_id", session.id)
    .eq("type", "REQUEST_BILL")
    .neq("status", "RESOLVED")
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "A bill request is already pending for this table." };
  }

  const { error } = await supabase.from("waiter_requests").insert({
    table_session_id: session.id,
    table_id: tableId,
    type: "REQUEST_BILL",
    status: "PENDING",
  });

  if (error) return { ok: false, error: "Could not create bill request. Try again." };

  // Advance table + session status for staff visibility.
  await Promise.all([
    supabase.from("tables").update({ status: "BILL_REQUESTED" }).eq("id", tableId),
    supabase.from("table_sessions").update({ status: "BILL_REQUESTED" }).eq("id", session.id),
  ]);

  revalidatePath("/waiter");
  revalidatePath("/cashier");
  return { ok: true, data: undefined };
}

/** Staff: mark a waiter request resolved. */
export async function resolveWaiterRequest(
  requestId: string,
): Promise<ActionResult> {
  const auth = await requireCapability("waiter.view");
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { error } = await admin
    .from("waiter_requests")
    .update({ status: "RESOLVED", resolved_at: new Date().toISOString(), resolved_by: auth.staff.id })
    .eq("id", requestId);

  if (error) return { ok: false, error: "Could not resolve request" };

  revalidatePath("/waiter");
  return { ok: true, data: undefined };
}
