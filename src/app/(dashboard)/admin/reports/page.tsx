"use client";

import { useEffect, useState, useMemo } from "react";
import { BarChart3, Download } from "lucide-react";
import { getReports } from "@/actions/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { ReportsData } from "@/actions/reports";

const COLORS = ["#e8502e", "#f4a24a", "#4caf7b", "#3b7ea1", "#e8a33d", "#d64545"];

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getReports(startDate, endDate);
      if (res.ok) setData(res.data);
      else toast.error(res.error);
      setLoading(false);
    }
    load();
  }, [startDate, endDate]);

  const revenueTotal = useMemo(
    () => data?.sales.reduce((sum, s) => sum + s.revenue_cents, 0) ?? 0,
    [data],
  );
  const ordersTotal = useMemo(
    () => data?.sales.reduce((sum, s) => sum + s.orders, 0) ?? 0,
    [data],
  );

  function downloadCsv() {
    if (!data) return;
    const rows = [
      ["Date", "Revenue", "Orders"],
      ...data.sales.map((s) => [s.date, s.revenue_cents, s.orders]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-6 text-primary" />
          <h1 className="text-xl font-bold text-app-ink">Reports</h1>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Start</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={downloadCsv}>
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      {!data || data.sales.length === 0 ? (
        <EmptyState icon="📊" title="No data for this range" description="Try a different date range." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="Revenue" value={<Price cents={revenueTotal} className="text-lg font-bold" />} />
            <MetricCard title="Orders" value={ordersTotal} />
            <MetricCard
              title="Avg. Order"
              value={<Price cents={data.insights.average_order_cents} className="text-lg font-bold" />}
            />
          </div>

          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.sales}>
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(v) => formatPrice(Number(v))} />
                        <Tooltip formatter={(v) => formatPrice(Number(v))} />
                        <Line type="monotone" dataKey="revenue_cents" stroke={COLORS[0]} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Orders by Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.sales}>
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="orders" fill={COLORS[1]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.products.slice(0, 10)} layout="vertical">
                        <XAxis type="number" tickFormatter={(v) => formatPrice(Number(v))} />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip formatter={(v) => formatPrice(Number(v))} />
                        <Bar dataKey="revenue_cents" fill={COLORS[0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categories}
                          dataKey="revenue_cents"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {data.categories.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatPrice(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Customers" value={data.insights.total_customers} />
                <MetricCard title="Total Orders" value={data.insights.total_orders} />
                <MetricCard
                  title="Avg Food Rating"
                  value={data.insights.average_food_rating?.toFixed(1) ?? "—"}
                />
                <MetricCard
                  title="Avg Service Rating"
                  value={data.insights.average_service_rating?.toFixed(1) ?? "—"}
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Peak Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.insights.peak_hours}>
                        <XAxis dataKey="hour" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="orders" fill={COLORS[2]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="mt-1 text-xl font-bold text-app-ink">{value}</div>
      </CardContent>
    </Card>
  );
}
