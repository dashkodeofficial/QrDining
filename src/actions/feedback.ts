"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionForFeedback } from "@/lib/session";
import { getCurrentStaff } from "@/lib/auth";
import { feedbackSchema } from "@/lib/validations";
import type { ActionResult } from "./orders";

/**
 * Submit feedback. Feedback is gated on having at least one SERVED or COMPLETED
 * order on the session. Payment completion is NOT required — the session may
 * have been ended by completePayment, so we use getSessionForFeedback which
 * allows ended sessions.
 */
export async function submitFeedback(
  raw: unknown,
): Promise<ActionResult> {
  const verified = await getSessionForFeedback();
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

  // Gate: served or completed order on this session.
  const { data: served } = await supabase
    .from("orders")
    .select("id")
    .eq("table_session_id", verified.session.id)
    .in("status", ["SERVED", "COMPLETED"])
    .limit(1)
    .maybeSingle();
  if (!served) {
    return { ok: false, error: "Feedback opens after your order is served." };
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
