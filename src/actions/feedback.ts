"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifiedSession } from "@/lib/session";
import { getCurrentStaff } from "@/lib/auth";
import { feedbackSchema } from "@/lib/validations";
import type { ActionResult } from "./orders";

/**
 * Submit feedback. Per spec, feedback is gated: the session must have at least
 * one SERVED order AND a COMPLETED payment. We enforce both server-side — a
 * client cannot unlock feedback by editing state.
 */
export async function submitFeedback(
  raw: unknown,
): Promise<ActionResult> {
  const verified = await getVerifiedSession();
  if (!verified) {
    const staff = await getCurrentStaff();
    if (staff) {
      return { ok: false, error: "Feedback is only available from a table QR session." };
    }
    return { ok: false, error: "Session expired — please re-scan the QR code." };
  }

  const parsed = feedbackSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid feedback" };
  }

  const supabase = createAdminClient();

  // Gate: served order + completed payment on this session.
  const { data: served } = await supabase
    .from("orders")
    .select("id")
    .eq("table_session_id", verified.session.id)
    .in("status", ["SERVED", "COMPLETED"])
    .limit(1)
    .maybeSingle();
  if (!served) {
    return { ok: false, error: "Feedback opens after your order is served and paid." };
  }

  const { data: paid } = await supabase
    .from("payments")
    .select("id")
    .eq("table_session_id", verified.session.id)
    .eq("status", "COMPLETED")
    .limit(1)
    .maybeSingle();
  if (!paid) {
    return { ok: false, error: "Feedback opens after your payment is complete." };
  }

  // One feedback per session.
  const { data: existing } = await supabase
    .from("feedback")
    .select("id")
    .eq("table_session_id", verified.session.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Thank you — we already received your feedback." };
  }

  const { error } = await supabase.from("feedback").insert({
    table_session_id: verified.session.id,
    order_id: served.id,
    food_rating: parsed.data.food_rating,
    service_rating: parsed.data.service_rating,
    comment: parsed.data.comment?.trim() || null,
  });

  if (error) return { ok: false, error: "Could not submit feedback. Try again." };

  revalidatePath(`/orders`);
  return { ok: true, data: undefined };
}
