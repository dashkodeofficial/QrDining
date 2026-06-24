import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TABLE_SESSION_COOKIE } from "@/lib/session";

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
 *
 * Implemented as a Route Handler (not a page) because cookies can only be
 * modified in Server Actions or Route Handlers — not in Server Components.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!/^[a-f0-9]{32,}$/.test(token)) {
    return invalidCodeResponse();
  }

  const supabase = createAdminClient();

  // Resolve token → table (token must be live).
  const { data: tokenRow } = await supabase
    .from("qr_tokens")
    .select("id, table_id, token, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at) {
    return invalidCodeResponse();
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

    if (error || !created) return invalidCodeResponse();
    sessionId = created.id;

    // Mark the table occupied.
    await supabase
      .from("tables")
      .update({ status: "OCCUPIED" })
      .eq("id", tokenRow.table_id);
  }

  const response = NextResponse.redirect(new URL("/menu", _request.url));
  response.cookies.set(TABLE_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6, // 6 hours
  });

  return response;
}

function invalidCodeResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invalid QR Code</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      min-height: 100dvh;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #f5f5f4;
      padding: 0 24px;
      text-align: center;
    }
    .emoji { font-size: 48px; }
    h1 { font-size: 20px; font-weight: 600; color: #1c1917; }
    p { max-width: 320px; font-size: 14px; color: #78716c; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="emoji">🔍</div>
  <h1>This QR code isn't valid</h1>
  <p>The code may be outdated or revoked. Please ask a staff member for assistance.</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
