import { redirect } from "next/navigation";
import { createServerClientFromCookies } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerClientFromCookies();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function GET() {
  const supabase = await createServerClientFromCookies();
  await supabase.auth.signOut();
  redirect("/login");
}
