"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, UtensilsCrossed, Banknote, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTables, getPendingWaiterRequests } from "@/actions/dashboard";
import { resolveWaiterRequest } from "@/actions/requests";
import { updateTableStatus } from "@/actions/tables";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { WAITER_REQUEST_LABEL, timeAgo } from "@/lib/format";
import { statusColor } from "@/lib/theme/colors";
import { toast } from "sonner";
import type { RestaurantTable, WaiterRequest, StaffRole } from "@/lib/types/db";

export default function WaiterDashboardPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [tablesRes, requestsRes, userRes] = await Promise.all([
        getTables(),
        getPendingWaiterRequests(),
        supabase.auth.getUser(),
      ]);
      if (tablesRes.ok) setTables(tablesRes.data);
      else toast.error(tablesRes.error);
      if (requestsRes.ok) setRequests(requestsRes.data);
      else toast.error(requestsRes.error);
      if (userRes.data?.user) {
        const { data: staff } = await supabase
          .from("staff")
          .select("role")
          .eq("user_id", userRes.data.user.id)
          .maybeSingle();
        if (staff?.role) setRole(staff.role as StaffRole);
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("waiter-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload) => {
          const table = payload.new as RestaurantTable;
          if (payload.eventType === "UPDATE") {
            setTables((prev) => prev.map((t) => (t.id === table.id ? table : t)));
          } else if (payload.eventType === "INSERT") {
            setTables((prev) => [...prev, table]);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_requests" },
        (payload) => {
          const req = payload.new as WaiterRequest;
          if (payload.eventType === "INSERT" && req.status === "PENDING") {
            setRequests((prev) => [req, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setRequests((prev) =>
              prev
                .map((r) => (r.id === req.id ? req : r))
                .filter((r) => r.status === "PENDING"),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markTableCleaned(tableId: string) {
    const res = await updateTableStatus(tableId, "AVAILABLE");
    toast[res.ok ? "success" : "error"](
      res.ok ? "Table marked as available" : res.error,
    );
  }

  async function markTableOccupied(tableId: string) {
    const res = await updateTableStatus(tableId, "OCCUPIED");
    toast[res.ok ? "success" : "error"](
      res.ok ? "Table marked as occupied" : res.error,
    );
  }

  async function setTableStatus(tableId: string, status: string) {
    const res = await updateTableStatus(tableId, status);
    toast[res.ok ? "success" : "error"](
      res.ok ? `Status updated to ${TABLE_STATUS_CONFIG[status]?.label ?? status}` : res.error,
    );
  }

  async function resolveRequest(requestId: string) {
    const res = await resolveWaiterRequest(requestId);
    toast[res.ok ? "success" : "error"](
      res.ok ? "Request resolved" : res.error,
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-card" />
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
            <UtensilsCrossed className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Waiter</h1>
            <p className="text-xs text-muted-foreground">
              {tables.filter((t) => t.status === "OCCUPIED").length} occupied · {requests.length} pending request{requests.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop: side-by-side; Mobile: tabs */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Tables floor grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Floor Plan</h2>
          {tables.length === 0 ? (
            <EmptyState icon="🪑" title="No tables" description="Tables will appear once they are created." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClean={() => markTableCleaned(table.id)}
                  onOccupy={() => markTableOccupied(table.id)}
                  onSetStatus={(status) => setTableStatus(table.id, status)}
                  canManageStatus={role === "ADMIN" || role === "MANAGER" || role === "WAITER"}
                />
              ))}
            </div>
          )}
        </div>

        {/* Requests panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Requests</h2>
            {requests.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {requests.length}
              </span>
            )}
          </div>
          {requests.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
              <p className="text-2xl mb-2">🛎️</p>
              <p className="text-sm font-medium">All clear</p>
              <p className="text-xs text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <RequestCard key={req.id} req={req} onResolve={() => resolveRequest(req.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="tables">
          <TabsList className="w-full">
            <TabsTrigger value="tables" className="flex-1">
              Tables
              {tables.filter((t) => t.status !== "AVAILABLE").length > 0 && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {tables.filter((t) => t.status !== "AVAILABLE").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1">
              Requests
              {requests.length > 0 && (
                <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables" className="space-y-3 mt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onClean={() => markTableCleaned(table.id)}
                  onOccupy={() => markTableOccupied(table.id)}
                  onSetStatus={(status) => setTableStatus(table.id, status)}
                  canManageStatus={role === "ADMIN" || role === "MANAGER" || role === "WAITER"}
                />
              ))}
              {tables.length === 0 && <EmptyState icon="🪑" title="No tables" description="Tables will appear once they are created." />}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-2 mt-3">
            {requests.length === 0 ? (
              <EmptyState icon="🛎️" title="No pending requests" description="All caught up!" />
            ) : (
              requests.map((req) => (
                <RequestCard key={req.id} req={req} onResolve={() => resolveRequest(req.id)} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RequestCard({ req, onResolve }: { req: WaiterRequest; onResolve: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-3 gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-xs"
              style={{ backgroundColor: statusColor(req.type) + "18", color: statusColor(req.type) }}
            >
              {WAITER_REQUEST_LABEL[req.type] ?? req.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{timeAgo(req.created_at)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Table {req.table_id.slice(0, 8)}</p>
        </div>
        <Button size="sm" onClick={onResolve} className="shrink-0">
          <CheckCircle2 className="mr-1 size-3.5" /> Resolve
        </Button>
      </CardContent>
    </Card>
  );
}

const TABLE_STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  AVAILABLE: { label: "Available", bg: "bg-emerald-50 dark:bg-emerald-950/20", dot: "bg-emerald-500" },
  OCCUPIED: { label: "Occupied", bg: "bg-blue-50 dark:bg-blue-950/20", dot: "bg-blue-500" },
  CLEANING: { label: "Cleaning", bg: "bg-amber-50 dark:bg-amber-950/20", dot: "bg-amber-500" },
  BILL_REQUESTED: { label: "Bill Requested", bg: "bg-orange-50 dark:bg-orange-950/20", dot: "bg-orange-500" },
  PAYMENT_PENDING: { label: "Payment Pending", bg: "bg-red-50 dark:bg-red-950/20", dot: "bg-red-500" },
};

function TableCard({
  table,
  onClean,
  onOccupy,
  onSetStatus,
  canManageStatus,
}: {
  table: RestaurantTable;
  onClean: () => void;
  onOccupy: () => void;
  onSetStatus?: (status: string) => void;
  canManageStatus?: boolean;
}) {
  const cfg = TABLE_STATUS_CONFIG[table.status] ?? { label: table.status.replace(/_/g, " "), bg: "bg-muted", dot: "bg-muted-foreground" };

  return (
    <Card className={`${cfg.bg} border-border`}>
      <CardContent className="px-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-base leading-none">{table.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {table.seat_capacity} seats
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-background/70 px-2 py-1">
            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
            <span className="text-[10px] font-medium whitespace-nowrap">{cfg.label}</span>
          </div>
        </div>
        {table.status === "AVAILABLE" ? (
          <Button size="sm" variant="outline" className="w-full h-8 bg-background/50 text-xs" onClick={onOccupy}>
            <Sparkles className="mr-1.5 size-3" /> Mark Occupied
          </Button>
        ) : (
          <div className="flex gap-2">
            {table.status === "CLEANING" && (
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={onClean}>
                <Sparkles className="mr-1.5 size-3" /> Mark Available
              </Button>
            )}
            {(table.status === "BILL_REQUESTED" || table.status === "PAYMENT_PENDING") && (
              <Button size="sm" variant="outline" className="flex-1 h-8 bg-background/50 text-xs" disabled>
                <Banknote className="mr-1.5 size-3" /> Awaiting Payment
              </Button>
            )}
            {table.status === "OCCUPIED" && (
              <Button size="sm" variant="outline" className="flex-1 h-8 bg-background/50 text-xs" disabled>
                <Bell className="mr-1.5 size-3" /> Occupied
              </Button>
            )}
          </div>
        )}
        {canManageStatus && onSetStatus && (
          <div className="pt-0.5">
            <select
              value={table.status}
              onChange={(e) => onSetStatus(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.entries(TABLE_STATUS_CONFIG).map(([status, { label }]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
