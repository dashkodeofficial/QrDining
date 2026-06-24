import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TableSession } from "@/lib/types/db";

export const TABLE_SESSION_COOKIE = "qr-table-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 6; // 6 hours

/**
 * Resolved, validated customer table session — the trusted identity for all
 * customer Server Actions.
 *
 * The session id is stored in an httpOnly cookie. On every mutation we reload
 * the session from the DB using the service-role client and verify that:
 *   1. the session exists and has not ended,
 *   2. the qr_token that opened it is still valid (not revoked),
 *   3. the table still maps to that token.
 *
 * This means a customer can never spoof another table by editing a URL — the
 * only thing they control (the cookie) is opaque, and it is re-checked against
 * the immutable token→table mapping on every write.
 */
export interface VerifiedSession {
  session: TableSession;
  table_id: string;
  qr_token: string;
}

export async function getVerifiedSession(): Promise<VerifiedSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(TABLE_SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const supabase = createAdminClient();

  // 1. session row
  const { data: session, error } = await supabase
    .from("table_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) return null;
  if (session.ended_at) return null;

  // 2. token still valid and maps to this session's table
  const { data: tokenRow } = await supabase
    .from("qr_tokens")
    .select("token, revoked_at, table_id")
    .eq("id", session.qr_token_id)
    .maybeSingle();
  if (!tokenRow || tokenRow.revoked_at) return null;
  if (tokenRow.table_id !== session.table_id) return null;

  return {
    session,
    table_id: session.table_id,
    qr_token: tokenRow.token,
  };
}

/** Set the session cookie (used by the /qr/[token] resolver). */
export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TABLE_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TABLE_SESSION_COOKIE);
}
