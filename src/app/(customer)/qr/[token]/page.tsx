import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Secure QR entry point — the URL printed on every table QR.
 *
 *   /qr/<opaque-token>
 *
 * The token resolves to exactly one table. We never expose the table_id in
 * the URL. On a valid scan we open (or resume) a table session, drop a short-
 * lived httpOnly cookie referencing the session, then redirect to the menu.
 *
 * A revoked or unknown token shows a friendly invalid-code screen.
 */
export default async function QrResolvePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[a-f0-9]{32,}$/.test(token)) {
    return <InvalidCode />;
  }

  const supabase = createAdminClient();

  // Resolve token → table (token must be live).
  const { data: tokenRow } = await supabase
    .from("qr_tokens")
    .select("id, table_id, token, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at) {
    return <InvalidCode />;
  }

  // Resume an active session for this table if one exists, else create one.
  const { data: existing } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("table_id", tokenRow.table_id)
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId: string;

  if (existing) {
    sessionId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("table_sessions")
      .insert({
        table_id: tokenRow.table_id,
        qr_token_id: tokenRow.id,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (error || !created) return <InvalidCode />;
    sessionId = created.id;

    // Mark the table occupied.
    await supabase
      .from("tables")
      .update({ status: "OCCUPIED" })
      .eq("id", tokenRow.table_id);
  }

  await setSessionCookie(sessionId);
  redirect("/menu");
}

function InvalidCode() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-app-surface px-6 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="text-xl font-semibold text-app-ink">
        This QR code isn&apos;t valid
      </h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        The code may be outdated or revoked. Please ask a staff member for
        assistance.
      </p>
    </main>
  );
}
