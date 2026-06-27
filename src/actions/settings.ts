"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability, getCurrentStaff } from "@/lib/auth";
import { settingsSchema } from "@/lib/validations";
import type { ActionResult } from "./orders";
import type { RestaurantSettings } from "@/lib/types/db";

export async function getSettings(): Promise<ActionResult<RestaurantSettings>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Could not load settings." };
  return { ok: true, data };
}

export interface PublicSettings {
  tax_rate_percent: number;
  service_charge_amount: number;
  primary_color: string;
  favicon_url: string | null;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("restaurant_settings")
    .select("tax_rate_percent, service_charge_amount, primary_color, favicon_url")
    .limit(1)
    .maybeSingle();

  return {
    tax_rate_percent: data?.tax_rate_percent ?? 0,
    service_charge_amount: data?.service_charge_amount ?? 0,
    primary_color: data?.primary_color ?? "#e23744",
    favicon_url: data?.favicon_url ?? null,
  };
}

export async function updateSettings(raw: unknown): Promise<ActionResult> {
  const auth = await requireCapability("settings.manage");
  if (!auth.ok) return auth;

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("restaurant_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("restaurant_settings")
      .update({
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        tax_rate_percent: parsed.data.tax_rate_percent,
        service_charge_amount: parsed.data.service_charge_amount,
        receipt_footer: parsed.data.receipt_footer || null,
        primary_color: parsed.data.primary_color || null,
        favicon_url: parsed.data.favicon_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "Could not update settings." };
  } else {
    const { error } = await supabase.from("restaurant_settings").insert({
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      tax_rate_percent: parsed.data.tax_rate_percent,
      service_charge_amount: parsed.data.service_charge_amount,
      receipt_footer: parsed.data.receipt_footer || null,
      primary_color: parsed.data.primary_color || null,
      favicon_url: parsed.data.favicon_url || null,
    });
    if (error) return { ok: false, error: "Could not create settings." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/menu");
  return { ok: true, data: undefined };
}

/**
 * Upload a new favicon to the favicons bucket. Deletes the previous favicon
 * from storage if one exists, then updates restaurant_settings.favicon_url.
 */
export async function uploadFavicon(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const auth = await requireCapability("settings.manage");
  if (!auth.ok) return auth;

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "No file provided." };

  if (file.size > 512 * 1024) {
    return { ok: false, error: "Favicon must be under 512 KB." };
  }

  const supabase = createAdminClient();

  // Fetch existing settings for old favicon URL
  const { data: existing } = await supabase
    .from("restaurant_settings")
    .select("id, favicon_url")
    .limit(1)
    .maybeSingle();

  // Upload new favicon
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const { error: uploadErr } = await supabase.storage
    .from("favicons")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadErr) {
    return { ok: false, error: "Upload failed: " + uploadErr.message };
  }

  const { data: urlData } = supabase.storage
    .from("favicons")
    .getPublicUrl(fileName);

  const newUrl = urlData.publicUrl;

  // Delete old favicon from storage
  if (existing?.favicon_url) {
    try {
      const oldPath = new URL(existing.favicon_url).pathname.split("/").pop();
      if (oldPath) {
        await supabase.storage.from("favicons").remove([oldPath]);
      }
    } catch {
      // ignore parse errors
    }
  }

  // Update settings
  if (existing) {
    await supabase
      .from("restaurant_settings")
      .update({ favicon_url: newUrl, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("restaurant_settings").insert({ favicon_url: newUrl });
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true, data: { url: newUrl } };
}

export async function getCurrentAdmin(): Promise<
  ActionResult<{ fullName: string; email: string }>
> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not logged in." };

  const supabase = createAdminClient();
  const { data: authUser } = await supabase.auth.admin.getUserById(staff.userId);

  return {
    ok: true,
    data: {
      fullName: staff.fullName,
      email: authUser.user?.email ?? "",
    },
  };
}

export async function updateAdminProfile(raw: {
  full_name: string;
  email?: string;
  password?: string;
}): Promise<ActionResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Not logged in." };

  const adminSupabase = createAdminClient();

  const updates: { email?: string; password?: string } = {};
  if (raw.email) updates.email = raw.email;
  if (raw.password) updates.password = raw.password;

  if (updates.email || updates.password) {
    const { error: authErr } = await adminSupabase.auth.admin.updateUserById(
      staff.userId,
      updates,
    );
    if (authErr) return { ok: false, error: "Could not update auth user: " + authErr.message };
  }

  const { error } = await adminSupabase
    .from("staff")
    .update({ full_name: raw.full_name })
    .eq("id", staff.id);

  if (error) return { ok: false, error: "Update failed." };
  revalidatePath("/admin/settings");
  return { ok: true, data: undefined };
}
