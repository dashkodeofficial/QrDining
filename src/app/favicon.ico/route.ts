import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("restaurant_settings")
    .select("favicon_url")
    .limit(1)
    .maybeSingle();

  const origin = new URL(request.url).origin;
  const target = data?.favicon_url ?? `${origin}/favicon.svg`;

  return NextResponse.redirect(target, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
