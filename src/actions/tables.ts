"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability, requireAnyStaff, type CurrentStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { tableSchema, staffSchema } from "@/lib/validations";
import { generateQrToken } from "@/lib/qr";
import type { ActionResult } from "./orders";

/* ======================= TABLES ========================================= */

export async function createTable(
  raw: unknown,
): Promise<ActionResult<{ id: string; token: string }>> {
  const auth = await requireCapability("tables.manage");
  if (!auth.ok) return auth;

  const parsed = tableSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = createAdminClient();

  // Create table + QR token in one logical step.
  const { data: table, error: tableErr } = await supabase
    .from("tables")
    .insert({
      name: parsed.data.name,
      seat_capacity: parsed.data.seat_capacity,
    })
    .select("id")
    .single();

  if (tableErr || !table) return { ok: false, error: "Could not create table." };

  const token = generateQrToken();
  const { error: tokenErr } = await supabase.from("qr_tokens").insert({
    table_id: table.id,
    token,
  });

  if (tokenErr) {
    await supabase.from("tables").delete().eq("id", table.id);
    return { ok: false, error: "Could not generate QR token." };
  }

  revalidatePath("/admin/tables");
  return { ok: true, data: { id: table.id, token } };
}

export async function updateTable(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireCapability("tables.manage");
  if (!auth.ok) return auth;

  const parsed = tableSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tables")
    .update({
      name: parsed.data.name,
      seat_capacity: parsed.data.seat_capacity,
    })
    .eq("id", id);

  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin/tables");
  return { ok: true, data: undefined };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const auth = await requireCapability("tables.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from("tables").delete().eq("id", id);
  if (error) return { ok: false, error: "Delete failed (table may have active sessions)." };
  revalidatePath("/admin/tables");
  return { ok: true, data: undefined };
}


/**
 * Update table lifecycle status (used by waiters/cashier in Phase 2,
 * exposed here for completeness).
 */
export async function updateTableStatus(
  tableId: string,
  status: string,
): Promise<ActionResult> {
  const staff = await requireAnyStaff();
  if (!staff) return { ok: false, error: "Please log in." };
  const canUpdate = ["tables.manage", "tables.view", "waiter.view", "payments.manage"].some((c) =>
    can(staff.role, c as any),
  );
  if (!canUpdate) return { ok: false, error: "You do not have permission to update table status." };

  const valid = ["AVAILABLE", "OCCUPIED", "BILL_REQUESTED", "PAYMENT_PENDING", "CLEANING"];
  if (!valid.includes(status)) return { ok: false, error: "Invalid status" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("tables").update({ status }).eq("id", tableId);
  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin/tables");
  return { ok: true, data: undefined };
}

/* ======================= STAFF ========================================== */

/**
 * Create a staff record and their Supabase Auth user.
 */
export async function createStaff(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCapability("staff.manage");
  if (!auth.ok) return auth;

  const parsed = staffSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const adminSupabase = createAdminClient();

  // Create auth user with admin API
  const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password || "",
    email_confirm: true,
  });

  if (authErr || !authData?.user) {
    return { ok: false, error: authErr?.message ?? "Could not create auth user." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff")
    .insert({
      user_id: authData.user.id,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message.includes("unique") ? "Staff already exists for this user." : "Could not create staff." };
  revalidatePath("/admin/staff");
  return { ok: true, data };
}

export async function updateStaff(
  staffId: string,
  userId: string,
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireCapability("staff.manage");
  if (!auth.ok) return auth;

  const parsed = staffSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const adminSupabase = createAdminClient();

  // Update auth user email/password if provided
  const updates: { email?: string; password?: string } = {};
  if (parsed.data.email) updates.email = parsed.data.email;
  if (parsed.data.password) updates.password = parsed.data.password;

  if (updates.email || updates.password) {
    const { error: authErr } = await adminSupabase.auth.admin.updateUserById(
      userId,
      updates,
    );
    if (authErr) return { ok: false, error: "Could not update auth user: " + authErr.message };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("staff")
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role,
    })
    .eq("id", staffId);

  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin/staff");
  return { ok: true, data: undefined };
}

export async function reactivateStaff(staffId: string): Promise<ActionResult> {
  const auth = await requireCapability("staff.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from("staff").update({ active: true }).eq("id", staffId);
  if (error) return { ok: false, error: "Reactivation failed." };
  revalidatePath("/admin/staff");
  return { ok: true, data: undefined };
}

export async function deactivateStaff(staffId: string): Promise<ActionResult> {
  const auth = await requireCapability("staff.manage");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from("staff").update({ active: false }).eq("id", staffId);
  if (error) return { ok: false, error: "Deactivation failed." };
  revalidatePath("/admin/staff");
  return { ok: true, data: undefined };
}

export async function deleteStaff(
  staffId: string,
  userId: string,
): Promise<ActionResult> {
  const auth = await requireCapability("staff.manage");
  if (!auth.ok) return auth;

  const adminSupabase = createAdminClient();

  // Delete auth user first
  const { error: authErr } = await adminSupabase.auth.admin.deleteUser(userId);
  if (authErr) return { ok: false, error: "Could not delete auth user: " + authErr.message };

  // Delete staff row
  const { error } = await adminSupabase.from("staff").delete().eq("id", staffId);
  if (error) return { ok: false, error: "Delete failed." };

  revalidatePath("/admin/staff");
  return { ok: true, data: undefined };
}
