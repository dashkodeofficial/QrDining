import Link from "next/link";
import { createServerClientFromCookies } from "@/lib/supabase/server";
import {
  UtensilsCrossed,
  LayoutGrid,
  Users,
  CookingPot,
  Package,
  BarChart3,
  Settings,
  Activity,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createServerClientFromCookies();

  const today = new Date().toISOString().split("T")[0];

  const [pendingOrders, occupiedTables, activeStaff, todayRevenue, recentActivity] =
    await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "PLACED"),
      supabase.from("tables").select("id", { count: "exact", head: true }).eq("status", "OCCUPIED"),
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("active", true),
      supabase
        .from("orders")
        .select("total_cents")
        .gte("created_at", today)
        .not("status", "eq", "CANCELLED"),
      supabase
        .from("activity_logs")
        .select("id, action, created_at, entity_type")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const totalRevenueCents =
    (todayRevenue.data ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const revenuePkr = totalRevenueCents.toLocaleString();

  const kpis = [
    {
      label: "Today's Revenue",
      value: `Rs. ${revenuePkr}`,
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
      ring: "ring-emerald-100 dark:ring-emerald-900",
    },
    {
      label: "Pending Orders",
      value: pendingOrders.count ?? 0,
      icon: ShoppingBag,
      color: "bg-primary/10 text-primary",
      ring: "ring-primary/20",
    },
    {
      label: "Occupied Tables",
      value: occupiedTables.count ?? 0,
      icon: LayoutGrid,
      color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
      ring: "ring-amber-100 dark:ring-amber-900",
    },
    {
      label: "Active Staff",
      value: activeStaff.count ?? 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
      ring: "ring-blue-100 dark:ring-blue-900",
    },
  ];

  const navCards = [
    { href: "/admin/menu", label: "Menu", description: "Categories & items", icon: UtensilsCrossed, accent: "from-orange-500/10 to-red-500/10" },
    { href: "/admin/tables", label: "Tables", description: "QR codes & status", icon: LayoutGrid, accent: "from-amber-500/10 to-yellow-500/10" },
    { href: "/admin/staff", label: "Staff", description: "Roles & permissions", icon: Users, accent: "from-blue-500/10 to-indigo-500/10" },
    { href: "/kitchen", label: "Kitchen", description: "Live order board", icon: CookingPot, accent: "from-red-500/10 to-orange-500/10" },
    { href: "/admin/inventory", label: "Inventory", description: "Stock & thresholds", icon: Package, accent: "from-teal-500/10 to-green-500/10" },
    { href: "/admin/reports", label: "Reports", description: "Sales & insights", icon: BarChart3, accent: "from-purple-500/10 to-pink-500/10" },
    { href: "/admin/settings", label: "Settings", description: "Restaurant config", icon: Settings, accent: "from-slate-500/10 to-gray-500/10" },
    { href: "/admin/activity", label: "Activity", description: "Staff audit log", icon: Activity, accent: "from-cyan-500/10 to-sky-500/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back — here's what's happening today.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`ring-1 ${kpi.ring} shadow-none`}>
              <CardContent className="px-5 py-2">
                <div className="flex items-center justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${kpi.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground/40" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Nav cards */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Access</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {navCards.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
            <Link href="/admin/activity" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <Card className="shadow-none">
            <CardContent className="divide-y divide-border p-0">
              {(recentActivity.data ?? []).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
              )}
              {(recentActivity.data ?? []).map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                    <Activity className="size-3 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{log.action}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                      <Clock className="size-2.5" />
                      {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
