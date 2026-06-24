"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import { inventorySchema } from "@/lib/validations";
import type { ActionResult } from "./orders";
import type { Inventory } from "@/lib/types/db";

export async function getInventory(): Promise<ActionResult<Inventory[]>> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("name", { ascending: true });

  if (error) return { ok: false, error: "Could not load inventory." };
  return { ok: true, data: data ?? [] };
}

export async function updateInventory(
  inventoryId: string,
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const parsed = inventorySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("inventory")
    .update({
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      low_stock_threshold: parsed.data.low_stock_threshold,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventoryId);

  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin/inventory");
  return { ok: true, data: undefined };
}

export async function createInventory(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const parsed = inventorySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory")
    .insert({
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      low_stock_threshold: parsed.data.low_stock_threshold,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Could not create inventory item." };
  revalidatePath("/admin/inventory");
  return { ok: true, data };
}

export async function deleteInventory(inventoryId: string): Promise<ActionResult> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from("inventory").delete().eq("id", inventoryId);
  if (error) return { ok: false, error: "Delete failed." };
  revalidatePath("/admin/inventory");
  return { ok: true, data: undefined };
}
