import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security.
 *
 * SERVER-ONLY. Used exclusively inside Server Actions to perform validated
 * customer mutations (placing orders, calling waiters, requesting bills,
 * submitting feedback). Every action that uses this client MUST first
 * re-validate the customer's QR token + table session server-side, so that
 * the privilege of bypassing RLS is never exposed to an untrusted caller.
 *
 * Never import from a Client Component. The `server-only` marker enforces
 * this at build time.
 */

let _client: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return _client;
}
