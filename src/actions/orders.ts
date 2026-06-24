"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedSession } from "@/lib/session";
import { requireCapability } from "@/lib/auth";
import { logActivity } from "@/actions/activity";
import { placeOrderSchema } from "@/lib/validations";
import { sumCartTotal } from "@/lib/format";
import type { OrderStatus } from "@/lib/types/db";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Place an order for the current table session.
 *
 * Trust model: the customer's cart is untrusted. We re-validate the session
 * (anti-spoofing), then for EVERY line item we reload the live menu row and
 * use ITS current price + availability — never the price the browser sent.
 * Total is recomputed server-side. Inventory decrement happens via DB trigger.
 */
export async function placeOrder(
  raw: unknown,
): Promise<ActionResult<{ orderId: string }>> {
  // 1. Validate shape (once, used by both QR and admin paths)
  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }

  // 2. AuthN: valid QR session OR admin with tableId
  const verified = await getVerifiedSession();

  let tableId: string;
  let sessionId: string;

  if (verified) {
    tableId = verified.table_id;
    sessionId = verified.session.id;
  } else {
    // Admin path: no QR session, but authenticated admin with a selected table
    const admin = await requireCapability("orders.manage");
    if (!admin.ok) {
      return { ok: false, error: "Your session has expired. Please re-scan the QR code." };
    }

    if (!parsed.data.tableId) {
      return { ok: false, error: "Please select a table before placing an order." };
    }

    const supabase = createAdminClient();

    // Verify the table exists
    const { data: table } = await supabase
      .from("tables")
      .select("id, status")
      .eq("id", parsed.data.tableId)
      .maybeSingle();

    if (!table) {
      return { ok: false, error: "Selected table not found." };
    }

    // Find an active QR token for this table (needed for session creation)
    const { data: tokenRow } = await supabase
      .from("qr_tokens")
      .select("id")
      .eq("table_id", table.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tokenRow) {
      return { ok: false, error: "No active QR token for this table. Please generate one first." };
    }

    // Create a synthetic session for this admin order
    const { data: newSession, error: sessionErr } = await supabase
      .from("table_sessions")
      .insert({
        table_id: table.id,
        qr_token_id: tokenRow.id,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (sessionErr || !newSession) {
      return { ok: false, error: "Could not create a table session. Please try again." };
    }

    tableId = table.id;
    sessionId = newSession.id;
  }

  const supabase = createAdminClient();

  // 3. Re-fetch live menu rows for every item — use server prices/availability
  const itemIds = parsed.data.items.map((i) => i.menu_item_id);
  const { data: liveItems, error: fetchErr } = await supabase
    .from("menu_items")
    .select("id, name, price_cents, available")
    .in("id", itemIds);

  if (fetchErr) return { ok: false, error: "Could not verify menu items." };

  const liveById = new Map(liveItems.map((m) => [m.id, m]));
  const orderItems: {
    menu_item_id: string;
    name: string;
    unit_price_cents: number;
    quantity: number;
    notes: string | null;
  }[] = [];

  for (const line of parsed.data.items) {
    const live = liveById.get(line.menu_item_id);
    if (!live) {
      return { ok: false, error: `"${line.name}" is no longer on the menu.` };
    }
    if (!live.available) {
      return { ok: false, error: `Sorry, "${live.name}" is no longer available.` };
    }
    orderItems.push({
      menu_item_id: live.id,
      name: live.name,
      unit_price_cents: live.price_cents, // server-authoritative price
      quantity: line.quantity,
      notes: line.notes?.trim() ? line.notes.trim() : null,
    });
  }

  // 4. Server-side total
  const totalCents = sumCartTotal(orderItems);

  // 5. Insert order + items atomically
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      table_id: tableId,
      table_session_id: sessionId,
      status: "PLACED",
      total_cents: totalCents,
      notes: parsed.data.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: "Could not place your order. Please try again." };
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(
    orderItems.map((i) => ({ ...i, order_id: order.id })),
  );

  if (itemsErr) {
    // Best-effort rollback of the parent order
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "Could not save order items. Please try again." };
  }

  revalidatePath("/orders");
  revalidatePath("/orders/[id]");
  revalidatePath("/kitchen");

  return { ok: true, data: { orderId: order.id } };
}

/** Allowed forward transitions on the order lifecycle. */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PLACED: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
  SERVED: "COMPLETED",
};

/**
 * Advance an order to its next lifecycle state. Used by the minimal kitchen
 * board (Phase 1) so the customer's realtime tracking is fully demoable.
 * Staff-only — enforced by resolving the caller's session.
 */
export async function advanceOrderStatus(
  orderId: string,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const auth = await requireCapability("orders.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found" };

  const next = NEXT_STATUS[order.status as OrderStatus];
  if (!next) return { ok: false, error: "Order is already in a terminal state" };

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: next })
    .eq("id", orderId)
    .select("status")
    .single();

  if (error || !updated) return { ok: false, error: "Could not update order" };

  await logActivity("order.advance", { from: order.status, to: updated.status }, orderId);

  revalidatePath("/kitchen");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { ok: true, data: { status: updated.status as OrderStatus } };
}

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const auth = await requireCapability("orders.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "CANCELLED" })
    .in("id", [orderId])
    .in("status", ["PLACED", "ACCEPTED"]);

  if (error) return { ok: false, error: "Could not cancel order" };

  await logActivity("order.cancel", {}, orderId);

  revalidatePath("/kitchen");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true, data: undefined };
}
