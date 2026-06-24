"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth";
import type { ActionResult } from "./orders";

export interface SalesPoint {
  date: string;
  revenue_cents: number;
  orders: number;
}

export interface ProductStat {
  name: string;
  quantity: number;
  revenue_cents: number;
}

export interface CategoryStat {
  name: string;
  revenue_cents: number;
  orders: number;
}

export interface CustomerInsights {
  total_orders: number;
  total_customers: number;
  average_order_cents: number;
  peak_hours: { hour: number; orders: number }[];
  average_food_rating: number | null;
  average_service_rating: number | null;
}

export interface ReportsData {
  sales: SalesPoint[];
  products: ProductStat[];
  categories: CategoryStat[];
  insights: CustomerInsights;
}

export async function getReports(
  startDate: string,
  endDate: string,
): Promise<ActionResult<ReportsData>> {
  const auth = await requireCapability("reports.view");
  if (!auth.ok) return auth;

  const supabase = createAdminClient();

  // Sales by day.
  const { data: salesRows } = await supabase.rpc("get_sales_by_day", {
    start_date: startDate,
    end_date: endDate,
  });

  // Product stats.
  const { data: productRows } = await supabase.rpc("get_product_stats", {
    start_date: startDate,
    end_date: endDate,
  });

  // Category stats.
  const { data: categoryRows } = await supabase.rpc("get_category_stats", {
    start_date: startDate,
    end_date: endDate,
  });

  // Customer insights.
  const { data: insightsRow } = await supabase.rpc("get_customer_insights", {
    start_date: startDate,
    end_date: endDate,
  });

  const sales: SalesPoint[] = (salesRows ?? []).map((r: any) => ({
    date: r.date,
    revenue_cents: r.revenue_cents,
    orders: r.orders,
  }));

  const products: ProductStat[] = (productRows ?? []).map((r: any) => ({
    name: r.name,
    quantity: r.quantity,
    revenue_cents: r.revenue_cents,
  }));

  const categories: CategoryStat[] = (categoryRows ?? []).map((r: any) => ({
    name: r.name,
    revenue_cents: r.revenue_cents,
    orders: r.orders,
  }));

  const insightsRaw = (insightsRow ?? [])[0] ?? {
    total_orders: 0,
    total_customers: 0,
    average_order_cents: 0,
    peak_hours: [],
    average_food_rating: null,
    average_service_rating: null,
  };

  const insights: CustomerInsights = {
    total_orders: insightsRaw.total_orders ?? 0,
    total_customers: insightsRaw.total_customers ?? 0,
    average_order_cents: insightsRaw.average_order_cents ?? 0,
    peak_hours: insightsRaw.peak_hours ?? [],
    average_food_rating: insightsRaw.average_food_rating ?? null,
    average_service_rating: insightsRaw.average_service_rating ?? null,
  };

  return { ok: true, data: { sales, products, categories, insights } };
}
