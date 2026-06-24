import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (singleton). Uses the anon key, so every
 * request is subject to Row Level Security. Customer-facing reads (menu,
 * categories) and realtime subscriptions flow through here.
 *
 * Customer WRITES never use this client — they go through Server Actions
 * that validate the QR token server-side with the service-role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
