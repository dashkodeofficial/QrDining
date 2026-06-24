"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedSession } from "@/lib/session";
import { requireCapability } from "@/lib/auth";
import { logActivity } from "@/actions/activity";
import { placeOrderSchema } from "@/lib/validations";
import { sumCartTotal } from "@/lib/format";
import { getPublicSettings } from "@/actions/settings";
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
 * Total is recomputed server-side.
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

    // Reuse an existing active session for this table if one exists
    const { data: existingSession } = await supabase
      .from("table_sessions")
      .select("id")
      .eq("table_id", table.id)
      .is("ended_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      tableId = table.id;
      sessionId = existingSession.id;
    } else {
      // No active session — create a new one
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

  // 4. Server-side subtotal + grand total (with tax + service charge)
  const subtotalCents = sumCartTotal(orderItems);
  const { tax_rate_percent: taxRate, service_charge_amount: serviceCharge } = await getPublicSettings();
  const taxCents = Math.round(subtotalCents * taxRate / 100);
  const totalCents = subtotalCents + taxCents + serviceCharge;

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

export interface OrderHistoryItem {
  id: string;
  table_id: string;
  table_session_id: string;
  status: OrderStatus;
  total_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  table_name: string | null;
  item_count: number;
}

export interface PaginatedOrders {
  orders: OrderHistoryItem[];
  total: number;
}

export async function getAllOrders(
  page: number = 1,
  pageSize: number = 20,
  statusFilter?: string,
): Promise<ActionResult<PaginatedOrders>> {
  const auth = await requireCapability("orders.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*, tables(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (statusFilter && statusFilter !== "ALL") {
    query = query.eq("status", statusFilter);
  }

  const { data, error, count } = await query;

  if (error) return { ok: false, error: "Could not load orders." };

  const orderIds = (data ?? []).map((o) => o.id);
  const { data: itemsData } = await supabase
    .from("order_items")
    .select("order_id")
    .in("order_id", orderIds);

  const itemCountMap = new Map<string, number>();
  for (const item of itemsData ?? []) {
    itemCountMap.set(item.order_id, (itemCountMap.get(item.order_id) ?? 0) + 1);
  }

  const orders: OrderHistoryItem[] = (data ?? []).map((o) => ({
    id: o.id,
    table_id: o.table_id,
    table_session_id: o.table_session_id,
    status: o.status as OrderStatus,
    total_cents: o.total_cents,
    notes: o.notes,
    created_at: o.created_at,
    updated_at: o.updated_at,
    table_name: (o as any).tables?.name ?? null,
    item_count: itemCountMap.get(o.id) ?? 0,
  }));

  return { ok: true, data: { orders, total: count ?? 0 } };
}

export interface OrderInvoiceData {
  orderId: string;
  tableName: string;
  status: string;
  createdAt: string;
  items: { name: string; quantity: number; unit_price_cents: number; notes: string | null }[];
  subtotalCents: number;
  taxRatePercent: number;
  taxCents: number;
  serviceChargeCents: number;
  totalCents: number;
  restaurant: {
    name: string;
    address: string | null;
    phone: string | null;
    receipt_footer: string | null;
  };
}

export async function getOrderInvoice(
  orderId: string,
): Promise<ActionResult<OrderInvoiceData>> {
  const auth = await requireCapability("orders.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  const [orderRes, settingsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*, tables(name)")
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("restaurant_settings")
      .select("name, address, phone, receipt_footer, tax_rate_percent, service_charge_amount")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!orderRes.data) return { ok: false, error: "Order not found." };

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  const items = (itemsData ?? []).map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unit_price_cents: i.unit_price_cents,
    notes: i.notes,
  }));

  const subtotalCents = items.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);
  const taxRatePercent = settingsRes.data?.tax_rate_percent ?? 0;
  const serviceChargeCents = settingsRes.data?.service_charge_amount ?? 0;
  const taxCents = Math.round(subtotalCents * taxRatePercent / 100);
  const totalCents = subtotalCents + taxCents + serviceChargeCents;

  return {
    ok: true,
    data: {
      orderId,
      tableName: (orderRes.data as any).tables?.name ?? "Table",
      status: orderRes.data.status,
      createdAt: orderRes.data.created_at,
      items,
      subtotalCents,
      taxRatePercent,
      taxCents,
      serviceChargeCents,
      totalCents,
      restaurant: {
        name: settingsRes.data?.name ?? "Restaurant",
        address: settingsRes.data?.address ?? null,
        phone: settingsRes.data?.phone ?? null,
        receipt_footer: settingsRes.data?.receipt_footer ?? null,
      },
    },
  };
}
