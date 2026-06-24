"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  User,
  ShoppingBag,
  UtensilsCrossed,
  LayoutGrid,
  Users,
  Settings,
  Bell,
  Banknote,
  FileText,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getActivityLogs, type ActivityLogWithStaff } from "@/actions/activity-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ENTITY_CONFIG: Record<string, { icon: typeof Activity; color: string }> = {
  order: { icon: ShoppingBag, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
  menu: { icon: UtensilsCrossed, color: "bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400" },
  table: { icon: LayoutGrid, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
  staff: { icon: Users, color: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" },
  settings: { icon: Settings, color: "bg-slate-50 text-slate-600 dark:bg-slate-950/30 dark:text-slate-400" },
  request: { icon: Bell, color: "bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400" },
  payment: { icon: Banknote, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" },
  feedback: { icon: FileText, color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400" },
  inventory: { icon: Package, color: "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400" },
};

function getEntityConfig(entityType?: string | null) {
  if (entityType && ENTITY_CONFIG[entityType]) return ENTITY_CONFIG[entityType];
  return { icon: Activity, color: "bg-muted text-muted-foreground" };
}

const ACTION_LABELS: Record<string, string> = {
  "order.place": "Placed an order",
  "order.advance": "Advanced order status",
  "order.cancel": "Cancelled an order",
  "menu.create": "Created menu item",
  "menu.update": "Updated menu item",
  "menu.delete": "Deleted menu item",
  "category.create": "Created category",
  "category.update": "Updated category",
  "category.delete": "Deleted category",
  "table.create": "Added a table",
  "table.update": "Updated table",
  "table.delete": "Removed a table",
  "table.status": "Changed table status",
  "staff.create": "Added staff member",
  "staff.update": "Updated staff member",
  "staff.delete": "Removed staff member",
  "settings.update": "Updated restaurant settings",
  "request.resolve": "Resolved waiter request",
  "payment.generate": "Generated bill",
  "payment.complete": "Completed payment",
  "feedback.submit": "Submitted feedback",
};

function formatAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const [entity, verb] = action.split(".");
  if (!verb) return action.replace(/_/g, " ");
  return `${verb.replace(/_/g, " ")} ${entity ?? ""}`.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const input = new Date(date);
  input.setHours(0, 0, 0, 0);

  if (input.getTime() === today.getTime()) return "Today";
  if (input.getTime() === yesterday.getTime()) return "Yesterday";
  return input.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(logs: ActivityLogWithStaff[]): { label: string; logs: ActivityLogWithStaff[] }[] {
  const groups: Record<string, ActivityLogWithStaff[]> = {};
  for (const log of logs) {
    const d = new Date(log.created_at);
    const label = formatDateLabel(d);
    if (!groups[label]) groups[label] = [];
    groups[label].push(log);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, logs: items }));
}

const PAGE_SIZE = 50;

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogWithStaff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getActivityLogs(page, PAGE_SIZE);
      if (res.ok) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
      } else {
        toast.error(res.error);
      }
      setLoading(false);
    }
    load();
  }, [page]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const grouped = groupByDate(logs);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-xs text-muted-foreground">
              {total} entr{total !== 1 ? "ies" : "y"} total
            </p>
          </div>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon="📋" title="No activity yet" description="Staff actions will appear here as they happen." />
      ) : (
        <>
          <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Date label */}
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-border/50" />
              </div>

              {/* Log entries */}
              <Card className="overflow-hidden border-border/50">
                <CardContent className="divide-y divide-border/50 p-0">
                  {group.logs.map((log) => {
                    const cfg = getEntityConfig(log.entity_type);
                    const Icon = cfg.icon;
                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                        {/* Icon */}
                        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", cfg.color)}>
                          <Icon className="size-4" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">
                              {formatAction(log.action)}
                            </p>
                            {log.staff_name && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="size-3" />
                                {log.staff_name}
                              </span>
                            )}
                          </div>

                          {/* Metadata pills */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(log.metadata).slice(0, 4).map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {key}: {String(value).length > 30 ? String(value).slice(0, 30) + "…" : String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="size-3" />
                            {formatTime(new Date(log.created_at))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
