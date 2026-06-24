"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import type { ActionResult } from "./orders";
import type { Order, OrderItem, RestaurantTable, WaiterRequest, Payment } from "@/lib/types/db";

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export async function getActiveOrders(): Promise<ActionResult<OrderWithItems[]>> {
  const auth = await requireCapability("kitchen.view");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .in("status", ["PLACED", "ACCEPTED", "PREPARING", "READY"])
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: "Could not load orders." };
  if (!orders || orders.length === 0) return { ok: true, data: [] };

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .in(
      "order_id",
      orders.map((o) => o.id),
    );

  if (itemsError) return { ok: false, error: "Could not load order items." };

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const data: OrderWithItems[] = orders.map((o) => ({
    ...o,
    items: itemsByOrder.get(o.id) ?? [],
  }));

  return { ok: true, data };
}

export async function getTables(): Promise<ActionResult<RestaurantTable[]>> {
  const auth = await requireCapability("tables.view");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .order("name", { ascending: true });

  if (error) return { ok: false, error: "Could not load tables." };
  return { ok: true, data: data ?? [] };
}

export async function getPendingWaiterRequests(): Promise<ActionResult<WaiterRequest[]>> {
  const auth = await requireCapability("waiter.view");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waiter_requests")
    .select("*")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: "Could not load requests." };
  return { ok: true, data: data ?? [] };
}

export async function getPendingPayments(): Promise<ActionResult<Payment[]>> {
  const auth = await requireCapability("payments.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .in("status", ["PENDING", "BILL_REQUESTED"])
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: "Could not load payments." };
  return { ok: true, data: data ?? [] };
}
