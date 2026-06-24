import { Suspense } from "react";
import { createServerClientFromCookies } from "@/lib/supabase/server";
import MenuContent from "@/components/customer/menu-content";
import MenuSkeleton from "@/components/customer/menu-skeleton";

export const dynamic = "force-dynamic";

/**
 * Menu page — server component that loads categories + items, then hands
 * them to a client component for search/category tabs + add-to-cart interactivity.
 *
 * Only available items (RLS + available=true filter) are returned to the
 * customer.
 */
export default async function MenuPage() {
  const supabase = await createServerClientFromCookies();

  const [categoriesRes, itemsRes, settingsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("*")
      .eq("available", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("restaurant_settings")
      .select("name")
      .limit(1)
      .maybeSingle(),
  ]);

  const categories = categoriesRes.data ?? [];
  const items = itemsRes.data ?? [];
  const restaurantName = settingsRes.data?.name ?? "Restaurant";

  return (
    <>
      {/* Compact header */}
      <div className="border-b border-border/40 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Scan &bull; Order &bull; Eat
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-app-ink sm:text-2xl lg:text-3xl">
            {restaurantName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-lg">
            Browse our menu and order your favorites directly from your table.
          </p>
        </div>
      </div>

      <Suspense fallback={<MenuSkeleton />}>
        <MenuContent categories={categories} items={items} restaurantName={restaurantName} />
      </Suspense>
    </>
  );
}
