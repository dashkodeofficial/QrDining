"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import type { ActionResult } from "./orders";
import type { Payment } from "@/lib/types/db";

export async function getPayments(): Promise<ActionResult<Payment[]>> {
  const auth = await requireCapability("payments.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: "Could not load payments." };
  return { ok: true, data: data ?? [] };
}

/**
 * Generate a bill/payment for the active session of a table. Computes the
 * total from non-cancelled orders and creates a PENDING payment.
 */
export async function generateBill(
  tableId: string,
): Promise<ActionResult<{ id: string; amountCents: number }>> {
  const auth = await requireCapability("payments.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  // Find the most recent active session for this table.
  const { data: session } = await supabase
    .from("table_sessions")
    .select("id, table_id, status")
    .eq("table_id", tableId)
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { ok: false, error: "No active session for this table." };

  const { data: orders } = await supabase
    .from("orders")
    .select("total_cents")
    .eq("table_session_id", session.id)
    .neq("status", "CANCELLED");

  const amountCents = (orders ?? []).reduce((sum, o) => sum + o.total_cents, 0);

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      table_session_id: session.id,
      amount_cents: amountCents,
      method: "CASH",
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error || !payment) return { ok: false, error: "Could not generate bill." };

  await Promise.all([
    supabase.from("tables").update({ status: "PAYMENT_PENDING" }).eq("id", session.table_id),
    supabase.from("table_sessions").update({ status: "PAYMENT_PENDING" }).eq("id", session.id),
  ]);

  revalidatePath("/cashier");
  revalidatePath("/waiter");
  return { ok: true, data: { id: payment.id, amountCents } };
}

/**
 * Record a payment for a table session. Used by the cashier when a customer
 * asks for the bill, or to pre-create a payment for a table session.
 */
export async function recordPayment(
  tableSessionId: string,
  amountCents: number,
  method: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCapability("payments.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  // Get the session's table and current orders total.
  const { data: session } = await supabase
    .from("table_sessions")
    .select("table_id")
    .eq("id", tableSessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: "Session not found." };

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      table_session_id: tableSessionId,
      amount_cents: amountCents,
      method,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error || !payment) return { ok: false, error: "Could not record payment." };

  // Advance table/session status for staff visibility.
  await Promise.all([
    supabase.from("tables").update({ status: "PAYMENT_PENDING" }).eq("id", session.table_id),
    supabase.from("table_sessions").update({ status: "PAYMENT_PENDING" }).eq("id", tableSessionId),
  ]);

  revalidatePath("/cashier");
  revalidatePath("/waiter");
  return { ok: true, data: { id: payment.id } };
}

/**
 * Mark a payment as completed and finalize the table session.
 */
export async function completePayment(paymentId: string): Promise<ActionResult> {
  const auth = await requireCapability("payments.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("table_session_id, table_session:table_sessions(table_id)")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false, error: "Payment not found." };

  const tableSessionId = payment.table_session_id;
  const tableId = (payment.table_session as any)?.table_id;

  const { error } = await supabase
    .from("payments")
    .update({ status: "COMPLETED", paid_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) return { ok: false, error: "Could not complete payment." };

  // Update table session and table status.
  await Promise.all([
    supabase.from("table_sessions").update({ status: "COMPLETED", ended_at: new Date().toISOString() }).eq("id", tableSessionId),
    tableId
      ? supabase.from("tables").update({ status: "CLEANING" }).eq("id", tableId)
      : Promise.resolve(),
  ]);

  revalidatePath("/cashier");
  revalidatePath("/waiter");
  return { ok: true, data: undefined };
}

/**
 * Generate a printable invoice for a table session. Returns the order total,
 * items, and payment details.
 */
export async function getInvoice(
  tableSessionId: string,
): Promise<
  ActionResult<{
    sessionId: string;
    tableName: string;
    items: { name: string; quantity: number; unit_price_cents: number; notes: string | null }[];
    totalCents: number;
  }>
> {
  const auth = await requireCapability("payments.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("table_sessions")
    .select("table_id, tables(name)")
    .eq("id", tableSessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: "Session not found." };

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_cents, status, order_items(*)")
    .eq("table_session_id", tableSessionId)
    .neq("status", "CANCELLED");

  const tableName = (session.tables as any)?.name ?? "Table";
  const items: { name: string; quantity: number; unit_price_cents: number; notes: string | null }[] = [];
  let totalCents = 0;

  for (const order of orders ?? []) {
    totalCents += order.total_cents;
    for (const item of (order as any).order_items ?? []) {
      items.push(item);
    }
  }

  return {
    ok: true,
    data: { sessionId: tableSessionId, tableName, items, totalCents },
  };
}
