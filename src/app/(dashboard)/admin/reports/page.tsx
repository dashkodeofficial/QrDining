"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  ShoppingBag,
  Users,
  Star,
  Clock,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { cn } from "@/lib/utils";
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
  CartesianGrid,
} from "recharts";
import type { ReportsData } from "@/actions/reports";

const COLORS = ["#e8502e", "#f4a24a", "#4caf7b", "#3b7ea1", "#e8a33d", "#d64545"];

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${period}`;
}

export default function ReportsPage() {
  const [allData, setAllData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState("7 Days");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Fetch 90 days of data once on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const res = await getReports(start.toISOString().split("T")[0], end.toISOString().split("T")[0]);
      if (res.ok) setAllData(res.data);
      else toast.error(res.error);
      setLoading(false);
    }
    load();
  }, []);

  // Client-side filtering — no DB calls
  const filteredData = useMemo<ReportsData | null>(() => {
    if (!allData) return null;
    const start = startDate;
    const end = endDate;

    const sales = allData.sales.filter((s) => s.date >= start && s.date <= end);

    // Products and categories are aggregated server-side for the full range;
    // we approximate the filtered subset by filtering sales dates from the
    // raw data. Since the RPCs already compute over the full 90-day range,
    // we show the full products/categories but compute KPIs from filtered sales.
    return {
      sales,
      products: allData.products,
      categories: allData.categories,
      insights: allData.insights,
    };
  }, [allData, startDate, endDate]);

  const revenueTotal = useMemo(
    () => filteredData?.sales.reduce((sum, s) => sum + s.revenue_cents, 0) ?? 0,
    [filteredData],
  );
  const ordersTotal = useMemo(
    () => filteredData?.sales.reduce((sum, s) => sum + s.orders, 0) ?? 0,
    [filteredData],
  );
  const avgOrder = ordersTotal > 0 ? Math.round(revenueTotal / ordersTotal) : 0;

  const handlePreset = useCallback((label: string, days: number) => {
    setActivePreset(label);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, []);

  const handleDateChange = (type: "start" | "end", value: string) => {
    setActivePreset("");
    if (type === "start") setStartDate(value);
    else setEndDate(value);
  };

  function downloadExcel() {
    if (!filteredData) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ["Report Summary"],
      ["Date Range", `${startDate} to ${endDate}`],
      [],
      ["Metric", "Value"],
      ["Total Revenue (Rs.)", formatPrice(revenueTotal)],
      ["Total Orders", ordersTotal],
      ["Average Order (Rs.)", formatPrice(avgOrder)],
      ["Total Customers", filteredData.insights.total_customers],
      ["Average Food Rating", filteredData.insights.average_food_rating?.toFixed(1) ?? "N/A"],
      ["Average Service Rating", filteredData.insights.average_service_rating?.toFixed(1) ?? "N/A"],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Sheet 2: Sales by Day
    const salesData = [
      ["Date", "Revenue (Rs.)", "Orders"],
      ...filteredData.sales.map((s) => [s.date, formatPrice(s.revenue_cents), s.orders]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(salesData);
    ws2["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Sales by Day");

    // Sheet 3: Top Products
    const productData = [
      ["Product", "Quantity Sold", "Revenue (Rs.)"],
      ...filteredData.products.map((p) => [p.name, p.quantity, formatPrice(p.revenue_cents)]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(productData);
    ws3["!cols"] = [{ wch: 25 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Top Products");

    // Sheet 4: Category Performance
    const catData = [
      ["Category", "Revenue (Rs.)", "Orders"],
      ...filteredData.categories.map((c) => [c.name, formatPrice(c.revenue_cents), c.orders]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(catData);
    ws4["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Categories");

    // Sheet 5: Customer Insights
    const peakHours = filteredData.insights.peak_hours;
    const customerData = [
      ["Customer Insights"],
      [],
      ["Metric", "Value"],
      ["Total Orders", filteredData.insights.total_orders],
      ["Total Customers", filteredData.insights.total_customers],
      ["Average Order (Rs.)", formatPrice(filteredData.insights.average_order_cents)],
      ["Avg Food Rating", filteredData.insights.average_food_rating?.toFixed(1) ?? "N/A"],
      ["Avg Service Rating", filteredData.insights.average_service_rating?.toFixed(1) ?? "N/A"],
      [],
      ["Peak Hours"],
      ["Hour", "Orders"],
      ...peakHours.map((p) => [formatHour(p.hour), p.orders]),
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(customerData);
    ws5["!cols"] = [{ wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws5, "Customer Insights");

    XLSX.writeFile(wb, `report-${startDate}-to-${endDate}.xlsx`);
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <BarChart3 className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reports</h1>
          <p className="text-xs text-muted-foreground">Sales, products, and customer insights</p>
        </div>
      </div>

      {/* Date filter bar */}
      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant={activePreset === p.label ? "default" : "outline"}
                size="sm"
                className="rounded-lg"
                onClick={() => handlePreset(p.label, p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="size-3" /> Start
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange("start", e.target.value)}
                className="w-auto rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="size-3" /> End
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange("end", e.target.value)}
                className="w-auto rounded-lg"
              />
            </div>
            <Button variant="outline" className="rounded-lg" onClick={downloadExcel}>
              <Download className="size-4 mr-1.5" /> Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {!filteredData || filteredData.sales.length === 0 ? (
        <EmptyState icon="📊" title="No data for this range" description="Try a different date range." />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              title="Revenue"
              value={<Price cents={revenueTotal} className="text-2xl font-bold" />}
              icon={TrendingUp}
              color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
            />
            <KpiCard
              title="Orders"
              value={<span className="text-2xl font-bold">{ordersTotal}</span>}
              icon={ShoppingBag}
              color="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
            />
            <KpiCard
              title="Avg. Order"
              value={<Price cents={avgOrder} className="text-2xl font-bold" />}
              icon={Clock}
              color="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
            />
          </div>

          <Tabs defaultValue="sales">
            <TabsList>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            {/* Sales tab */}
            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredData.sales}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => formatPrice(Number(v))} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v) => [formatPrice(Number(v)), "Revenue"]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                        />
                        <Line type="monotone" dataKey="revenue_cents" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
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
                      <BarChart data={filteredData.sales}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                        />
                        <Bar dataKey="orders" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products tab */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredData.products.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis type="number" tickFormatter={(v) => formatPrice(Number(v))} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(v) => [formatPrice(Number(v)), "Revenue"]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                        />
                        <Bar dataKey="revenue_cents" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/30">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Product</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Qty Sold</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredData.products.slice(0, 15).map((p, i) => (
                          <tr key={p.name} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium">{p.name}</td>
                            <td className="px-4 py-2.5 text-right">{p.quantity}</td>
                            <td className="px-4 py-2.5 text-right font-semibold"><Price cents={p.revenue_cents} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories tab */}
            <TabsContent value="categories" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revenue Share</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={filteredData.categories}
                            dataKey="revenue_cents"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={(entry) => entry.name}
                          >
                            {filteredData.categories.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => [formatPrice(Number(v)), "Revenue"]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Category Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/30">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Category</th>
                            <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Orders</th>
                            <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {filteredData.categories.map((c) => (
                            <tr key={c.name} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2.5 font-medium">{c.name}</td>
                              <td className="px-4 py-2.5 text-right">{c.orders}</td>
                              <td className="px-4 py-2.5 text-right font-semibold"><Price cents={c.revenue_cents} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Customers tab */}
            <TabsContent value="customers" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  title="Total Customers"
                  value={<span className="text-2xl font-bold">{filteredData.insights.total_customers}</span>}
                  icon={Users}
                  color="bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
                />
                <KpiCard
                  title="Total Orders"
                  value={<span className="text-2xl font-bold">{filteredData.insights.total_orders}</span>}
                  icon={ShoppingBag}
                  color="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                />
                <KpiCard
                  title="Avg Food Rating"
                  value={
                    <span className="text-2xl font-bold flex items-center gap-1">
                      {filteredData.insights.average_food_rating?.toFixed(1) ?? "—"}
                      {filteredData.insights.average_food_rating && <Star className="size-4 fill-amber-400 text-amber-400" />}
                    </span>
                  }
                  icon={Star}
                  color="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                />
                <KpiCard
                  title="Avg Service Rating"
                  value={
                    <span className="text-2xl font-bold flex items-center gap-1">
                      {filteredData.insights.average_service_rating?.toFixed(1) ?? "—"}
                      {filteredData.insights.average_service_rating && <Star className="size-4 fill-amber-400 text-amber-400" />}
                    </span>
                  }
                  icon={Star}
                  color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Peak Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredData.insights.peak_hours}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          labelFormatter={(label) => formatHour(Number(label))}
                          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }}
                        />
                        <Bar dataKey="orders" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
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

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className={cn("flex size-8 items-center justify-center rounded-lg", color)}>
            <Icon className="size-4" />
          </div>
        </div>
        <div className="mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}
