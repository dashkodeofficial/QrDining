"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Receipt, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyOrders, getMySessionId } from "@/actions/customer";
import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { statusColor } from "@/lib/theme/colors";
import type { Order } from "@/lib/types/db";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const [ordersRes, sessionRes] = await Promise.all([
        getMyOrders(),
        getMySessionId(),
      ]);

      if (!ordersRes.ok) {
        setError(ordersRes.error);
        setLoading(false);
        return;
      }

      setOrders(ordersRes.data);
      setLoading(false);

      if (!sessionRes.ok) return;
      const sessionId = sessionRes.data;

      if (sessionId) {
        channel = supabase
          .channel("orders-realtime")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
              filter: `table_session_id=eq.${sessionId}`,
            },
            (payload) => {
              if (payload.eventType === "INSERT") {
                setOrders((prev) => [payload.new as Order, ...prev]);
              } else if (payload.eventType === "UPDATE") {
                setOrders((prev) =>
                  prev.map((o) =>
                    o.id === (payload.new as Order).id ? (payload.new as Order) : o,
                  ),
                );
              }
            },
          )
          .subscribe();
      }
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link href="/menu" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-base font-bold text-app-ink">My Orders</h1>
        {!loading && orders.length > 0 && (
          <span className="ml-auto text-sm font-semibold text-muted-foreground">{orders.length} order{orders.length > 1 ? "s" : ""}</span>
        )}
      </header>

      {/* Desktop header */}
      <header className="sticky top-0 z-30 hidden border-b border-border/40 bg-card/95 px-8 py-4 backdrop-blur-md lg:block">
        <div className="flex items-center gap-3">
          <Link href="/menu" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <Receipt className="size-5 text-primary" />
          <h1 className="text-lg font-bold text-app-ink">My Orders</h1>
          {!loading && orders.length > 0 && (
            <span className="ml-auto text-sm font-semibold text-muted-foreground">{orders.length} order{orders.length > 1 ? "s" : ""}</span>
          )}
        </div>
      </header>

      <div className="px-4 py-5 lg:px-8 lg:py-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-border/50 bg-card p-5 space-y-3">
                <div className="h-4 w-1/3 rounded-lg bg-muted" />
                <div className="h-3 w-2/3 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <EmptyState
              icon="📋"
              title="No orders yet"
              description="Your orders will appear here once you place them."
              action={
                <Link href="/menu">
                  <Button className="rounded-xl"><Receipt className="mr-2 size-4" />Browse Menu</Button>
                </Link>
              }
            />
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-border/50 bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
              >
                <div
                  className="mt-1.5 h-10 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusColor(order.status) }}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-app-ink">Order #{order.id.slice(0, 8)}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {new Date(order.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <Price cents={order.total_cents} className="text-sm font-extrabold text-primary" />
                </div>
                <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <Badge
      variant="secondary"
      className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: color + "15", color: color, borderColor: color + "30" }}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
