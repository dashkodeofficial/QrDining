import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 Proxy (formerly "middleware").
 *
 * Refreshes the Supabase auth session cookie on every matched request so
 * Server Components and Server Actions always see a fresh staff session.
 *
 * Intentionally narrow matcher: it skips Next internals, static assets, and
 * the customer QR/menu routes (which are public and don't need a session).
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response.cookies.set(
            "sb-refresh-marker",
            crypto.randomUUID?.() ?? String(Date.now()),
            { path: "/", maxAge: 0 },
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSetUser refreshes the session cookie if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match staff dashboard + login paths. Skip:
     *  - _next/static, _next/images, favicon, public assets
     *  - /qr/* and customer routes (public, no session needed)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|qr|menu|cart|orders|api).*)",
  ],
};
