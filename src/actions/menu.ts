"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import { categorySchema, menuItemSchema } from "@/lib/validations";
import type { ActionResult } from "./orders";

/* ======================= CATEGORIES ====================================== */

export async function createCategory(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", parsed.data.name)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "A category with this name already exists." };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) return { ok: false, error: "Could not create category." };
  revalidatePath("/admin/menu");
  return { ok: true, data };
}

export async function updateCategory(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", parsed.data.name)
    .neq("id", id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "A category with this name already exists." };
  }

  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin/menu");
  return { ok: true, data: undefined };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Cannot delete a category that has menu items." };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };
  revalidatePath("/admin/menu");
  return { ok: true, data: undefined };
}

/* ======================= MENU ITEMS ===================================== */

export async function createMenuItem(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const parsed = menuItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price_cents: parsed.data.price,
      image_url: parsed.data.image_url || null,
      available: parsed.data.available,
      popular: parsed.data.popular,
      sort_order: parsed.data.sort_order,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: "Could not create menu item." };
  revalidatePath("/admin/menu");
  return { ok: true, data };
}

export async function updateMenuItem(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const parsed = menuItemSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price_cents: parsed.data.price,
      image_url: parsed.data.image_url || null,
      available: parsed.data.available,
      popular: parsed.data.popular,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true, data: undefined };
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  // Fetch the item to get its image_url before deleting
  const { data: item } = await supabase
    .from("menu_items")
    .select("image_url")
    .eq("id", id)
    .single();

  // Delete the item first
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed." };

  // Clean up storage image if present
  if (item?.image_url) {
    try {
      const path = new URL(item.image_url).pathname.split("/").pop();
      if (path) {
        await supabase.storage.from("menu-images").remove([path]);
      }
    } catch {
      // ignore parse errors
    }
  }

  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true, data: undefined };
}

export async function toggleMenuItemAvailability(
  id: string,
  available: boolean,
): Promise<ActionResult> {
  const auth = await requireCapability("menu.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ available })
    .eq("id", id);

  if (error) return { ok: false, error: "Toggle failed." };
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true, data: undefined };
}
