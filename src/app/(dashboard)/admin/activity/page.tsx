"use client";

import { useEffect, useState } from "react";
import { Activity, Clock } from "lucide-react";
import { getActivityLogs } from "@/actions/activity-logs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import type { ActivityLog } from "@/lib/types/db";

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getActivityLogs();
      if (res.ok) setLogs(res.data);
      else toast.error(res.error);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="size-6 text-primary" />
        <h1 className="text-xl font-bold text-app-ink">Activity Log</h1>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon="📋" title="No activity yet" description="Staff actions will appear here." />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.action}</Badge>
                    {log.entity_type && <span className="text-xs text-muted-foreground">{log.entity_type}</span>}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
