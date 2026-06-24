"use client";

import { useEffect, useState } from "react";
import { ChefHat, Clock, AlertCircle, RefreshCw, Utensils } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getActiveOrders } from "@/actions/dashboard";
import { advanceOrderStatus } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { timeAgo, elapsedMinutes, ORDER_STATUS_LABEL } from "@/lib/format";
import { statusColor } from "@/lib/theme/colors";
import { toast } from "sonner";
import type { OrderWithItems } from "@/actions/dashboard";
import type { OrderItem } from "@/lib/types/db";

const ACTIVE_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

const COLUMNS = [
  { key: "new", label: "New Orders", icon: "📥", statuses: ["PLACED", "ACCEPTED"] as string[], accent: "bg-amber-500", headerBg: "bg-amber-50 dark:bg-amber-950/30", headerText: "text-amber-700 dark:text-amber-300", countBg: "bg-amber-500", countText: "text-white" },
  { key: "preparing", label: "Preparing", icon: "🍳", statuses: ["PREPARING"] as string[], accent: "bg-blue-500", headerBg: "bg-blue-50 dark:bg-blue-950/30", headerText: "text-blue-700 dark:text-blue-300", countBg: "bg-blue-500", countText: "text-white" },
  { key: "ready", label: "Ready", icon: "✅", statuses: ["READY"] as string[], accent: "bg-emerald-500", headerBg: "bg-emerald-50 dark:bg-emerald-950/30", headerText: "text-emerald-700 dark:text-emerald-300", countBg: "bg-emerald-500", countText: "text-white" },
];

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const res = await getActiveOrders();
      if (res.ok) {
        setOrders(res.data);
      } else {
        toast.error(res.error);
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("kitchen-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as OrderWithItems;
          if (payload.eventType === "INSERT") {
            if (ACTIVE_STATUSES.includes(updated.status)) {
              setOrders((prev) => [...prev, { ...updated, items: [] }]);
            }
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) => {
              const next = prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
              return next.filter((o) => ACTIVE_STATUSES.includes(o.status));
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          const item = payload.new as OrderItem;
          if (payload.eventType === "INSERT") {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === item.order_id ? { ...o, items: [...o.items, item] } : o,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleAdvance(orderId: string) {
    const res = await advanceOrderStatus(orderId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    // Optimistically update local state so the board reflects the change immediately
    setOrders((prev) =>
      prev
        .map((o) => (o.id === orderId ? { ...o, status: res.data.status } : o))
        .filter((o) => ACTIVE_STATUSES.includes(o.status)),
    );
  }

  async function handleRefresh() {
    setLoading(true);
    const res = await getActiveOrders();
    if (res.ok) {
      setOrders(res.data);
      toast.success("Orders refreshed");
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <ChefHat className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kitchen</h1>
            <p className="text-xs text-muted-foreground">{orders.length} active order{orders.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-1.5 size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Desktop: 3-column Kanban */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => col.statuses.includes(o.status));
          return (
            <div key={col.key} className="flex flex-col gap-3">
              <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 ${col.headerBg}`}>
                <div className={`h-8 w-1 rounded-full ${col.accent}`} />
                <span className="text-base">{col.icon}</span>
                <span className={`text-sm font-bold ${col.headerText}`}>{col.label}</span>
                {colOrders.length > 0 && (
                  <span className={`ml-auto flex size-6 items-center justify-center rounded-full ${col.countBg} ${col.countText} text-xs font-bold`}>
                    {colOrders.length}
                  </span>
                )}
              </div>
              <div className="space-y-3 min-h-[200px]">
                {colOrders.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground">No orders</p>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onAdvance={handleAdvance} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="w-full">
            {COLUMNS.map((col) => {
              const count = orders.filter((o) => col.statuses.includes(o.status)).length;
              return (
                <TabsTrigger key={col.key} value={col.key} className="flex-1">
                  {col.label}
                  {count > 0 && <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">{count}</span>}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {COLUMNS.map((col) => (
            <TabsContent key={col.key} value={col.key} className="space-y-3 mt-3">
              {orders.filter((o) => col.statuses.includes(o.status)).length === 0 ? (
                <EmptyState icon="🍳" title="No orders here" description="Orders will appear as customers place them." />
              ) : (
                orders.filter((o) => col.statuses.includes(o.status)).map((order) => (
                  <OrderCard key={order.id} order={order} onAdvance={handleAdvance} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}


function OrderCard({
  order,
  onAdvance,
}: {
  order: OrderWithItems;
  onAdvance: (id: string) => void;
}) {
  const minutes = elapsedMinutes(order.created_at);
  const isDelayed = minutes > 20;
  const isUrgent = minutes > 30;
  const nextLabel =
    order.status === "PLACED" ? "Accept" :
    order.status === "ACCEPTED" ? "Start Preparing" :
    order.status === "PREPARING" ? "Mark Ready" : "Mark Served";

  return (
    <Card className={
      isUrgent ? "border-destructive/50 ring-2 ring-destructive/20" :
      isDelayed ? "border-warning/50 ring-1 ring-warning/20" :
      undefined
    }>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-bold text-base">#{order.id.slice(0, 8).toUpperCase()}</p>
            {order.table_name && (
              <div className="flex items-center gap-1.5">
                <Utensils className="size-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">{order.table_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className={`size-3 ${isDelayed ? "text-warning" : "text-muted-foreground"}`} />
              <span className={`text-xs ${isDelayed ? "text-warning font-medium" : "text-muted-foreground"}`}>
                {timeAgo(order.created_at)}
              </span>
              {isDelayed && (
                <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                  <AlertCircle className="size-3" />
                  {minutes}m
                </span>
              )}
            </div>
          </div>
          <Badge
            variant="secondary"
            className="text-xs shrink-0"
            style={{
              backgroundColor: statusColor(order.status) + "20",
              color: statusColor(order.status),
              borderColor: statusColor(order.status) + "40",
            }}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.id}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{item.quantity}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
              </div>
              {item.notes && (
                <p className="mt-0.5 pl-7 text-xs text-muted-foreground italic">"{item.notes}"</p>
              )}
            </div>
          ))}
        </div>
        {order.notes && (
          <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">
            {order.notes}
          </p>
        )}
        <Button
          size="sm"
          className="w-full h-9"
          variant={order.status === "READY" ? "outline" : "default"}
          onClick={() => onAdvance(order.id)}
        >
          {nextLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
