"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Receipt,
  Printer,
  Download,
  FileText,
  Clock,
  CreditCard,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPayments, generateBill, completePayment, getInvoice, type InvoiceData } from "@/actions/payments";
import { getTables } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { formatDate } from "@/lib/format";
import { statusColor } from "@/lib/theme/colors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Payment, RestaurantTable } from "@/lib/types/db";

export default function CashierDashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [paymentsRes, tablesRes] = await Promise.all([
        getPayments(),
        getTables(),
      ]);
      if (paymentsRes.ok) setPayments(paymentsRes.data);
      else toast.error(paymentsRes.error);
      if (tablesRes.ok) setTables(tablesRes.data);
      else toast.error(tablesRes.error);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("cashier-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        (payload) => {
          const payment = payload.new as Payment;
          if (payload.eventType === "INSERT") {
            setPayments((prev) => [payment, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setPayments((prev) => prev.map((p) => (p.id === payment.id ? payment : p)));
          }
        },
      )
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleComplete(paymentId: string) {
    const res = await completePayment(paymentId);
    toast[res.ok ? "success" : "error"](
      res.ok ? "Payment marked as completed" : res.error,
    );
  }

  async function handleGenerateBill(tableSessionId: string) {
    const res = await generateBill(tableSessionId);
    toast[res.ok ? "success" : "error"](
      res.ok ? "Bill generated" : res.error,
    );
  }

  async function handlePrintInvoice(tableSessionId: string) {
    const res = await getInvoice(tableSessionId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    printInvoice(res.data);
  }

  async function handleDownloadInvoice(tableSessionId: string) {
    const res = await getInvoice(tableSessionId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    printInvoice(res.data);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </div>
    );
  }

  const pending = payments.filter((p) => p.status === "PENDING");
  const completed = payments.filter((p) => p.status === "COMPLETED");
  const billRequests = tables.filter((t) => t.status === "BILL_REQUESTED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <Banknote className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cashier Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Manage bills, payments, and invoices
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Clock className="size-4" />}
          label="Pending"
          value={pending.length}
          color="text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
        />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          label="Completed"
          value={completed.length}
          color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <StatCard
          icon={<FileText className="size-4" />}
          label="Bill Requests"
          value={billRequests.length}
          color="text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400"
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full justify-start rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="pending" className="gap-1.5 rounded-lg">
            <Clock className="size-3.5" />
            Pending
            {pending.length > 0 && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5 rounded-lg">
            <CheckCircle2 className="size-3.5" />
            Completed
            {completed.length > 0 && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {completed.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-1.5 rounded-lg">
            <FileText className="size-3.5" />
            Bill Requests
            {billRequests.length > 0 && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {billRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <EmptyState icon="💰" title="No pending payments" description="All bills are settled." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pending.map((p) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  onComplete={() => handleComplete(p.id)}
                  onPrint={() => handlePrintInvoice(p.table_session_id)}
                  onDownload={() => handleDownloadInvoice(p.table_session_id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <EmptyState icon="🧾" title="No completed payments" description="Completed payments appear here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {completed.map((p) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  onPrint={() => handlePrintInvoice(p.table_session_id)}
                  onDownload={() => handleDownloadInvoice(p.table_session_id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          {billRequests.length === 0 ? (
            <EmptyState icon="🧾" title="No bill requests" description="Customers will request bills here." />
          ) : (
            <div className="max-w-2xl grid gap-3 sm:grid-cols-2">
              {billRequests.map((t) => (
                <Card key={t.id} className="overflow-hidden border-border/50">
                  <div className="h-0.5 bg-orange-500" />
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30">
                        <FileText className="size-4 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.seat_capacity} seats</p>
                      </div>
                    </div>
                    <Button size="sm" className="shrink-0 h-8" onClick={() => handleGenerateBill(t.id)}>
                      <FileText className="mr-1.5 size-3.5" /> Generate Bill
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div className={cn("flex size-9 items-center justify-center rounded-lg", color)}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <Wallet className="size-3.5" />,
  CARD: <CreditCard className="size-3.5" />,
  UPI: <Banknote className="size-3.5" />,
  OTHER: <Banknote className="size-3.5" />,
};

function PaymentCard({
  payment,
  onComplete,
  onPrint,
  onDownload,
}: {
  payment: Payment;
  onComplete?: () => void;
  onPrint: () => void;
  onDownload: () => void;
}) {
  const color = statusColor(payment.status);
  const isPending = payment.status === "PENDING";

  return (
    <Card className="overflow-hidden border-border/50">
      <div className="h-1" style={{ backgroundColor: color }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: color + "18", color }}
            >
              <Receipt className="size-4" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none">
                Payment #{payment.id.slice(0, 8)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(payment.created_at)}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: color + "18",
              color: color,
              borderColor: color + "30",
            }}
          >
            {payment.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
          <Price cents={payment.amount_cents} className="text-lg font-bold text-primary" />
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {METHOD_ICONS[payment.method] ?? <Banknote className="size-3.5" />}
            {payment.method}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onPrint}>
            <Printer className="mr-1.5 size-4" /> Print
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onDownload}>
            <Download className="mr-1.5 size-4" /> Download
          </Button>
          {isPending && onComplete && (
            <Button size="sm" className="flex-1" onClick={onComplete}>
              <CheckCircle2 className="mr-1.5 size-4" /> Mark Paid
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function printInvoice(invoice: InvoiceData) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to print invoices.");
    return;
  }

  const invoiceNo = `INV-${invoice.sessionId.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const fmtPKR = (cents: number) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(cents);

  const itemsHTML = invoice.items.map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${item.name}${item.notes ? `<div style="font-size:11px;color:#999;margin-top:2px">${item.notes}</div>` : ""}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${fmtPKR(item.unit_price_cents)}</td>
      <td style="text-align:right;font-weight:600">${fmtPKR(item.unit_price_cents * item.quantity)}</td>
    </tr>
  `).join("");

  printWindow.document.open();
  printWindow.document.write("<!DOCTYPE html>");
  printWindow.document.write("<html><head><title>Invoice - " + (invoice.restaurant.name ?? "Restaurant") + "</title>");
  printWindow.document.write("<style>");
  printWindow.document.write("* { margin: 0; padding: 0; box-sizing: border-box; }");
  printWindow.document.write("body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #fff; }");
  printWindow.document.write(".invoice { max-width: 600px; margin: 0 auto; padding: 32px; }");
  printWindow.document.write(".header { display: flex; align-items: center; gap: 12px; padding-bottom: 20px; border-bottom: 2px solid #e23744; }");
  printWindow.document.write(".logo { width: 48px; height: 48px; border-radius: 12px; background: #e23744; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; }");
  printWindow.document.write(".restaurant-name { font-size: 20px; font-weight: 700; }");
  printWindow.document.write(".restaurant-info { font-size: 12px; color: #666; margin-top: 2px; }");
  printWindow.document.write(".invoice-meta { display: flex; justify-content: space-between; margin-top: 20px; padding: 12px 16px; background: #f8f8f8; border-radius: 8px; }");
  printWindow.document.write(".meta-item { font-size: 12px; }");
  printWindow.document.write(".meta-label { color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }");
  printWindow.document.write(".meta-value { font-weight: 600; margin-top: 2px; }");
  printWindow.document.write("table { width: 100%; border-collapse: collapse; margin-top: 20px; }");
  printWindow.document.write("th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; padding: 8px 12px; border-bottom: 2px solid #eee; }");
  printWindow.document.write("td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }");
  printWindow.document.write(".totals { margin-top: 16px; margin-left: auto; width: 240px; }");
  printWindow.document.write(".total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }");
  printWindow.document.write(".total-row.grand { border-top: 2px solid #eee; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; }");
  printWindow.document.write(".total-row.grand .value { color: #e23744; }");
  printWindow.document.write(".footer { margin-top: 32px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }");
  printWindow.document.write(".footer-text { font-size: 12px; color: #666; }");
  printWindow.document.write(".thank-you { font-size: 14px; font-weight: 600; margin-top: 8px; color: #1a1a1a; }");
  printWindow.document.write(".payment-status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }");
  printWindow.document.write(".status-completed { background: #dcfce7; color: #16a34a; }");
  printWindow.document.write(".status-pending { background: #fef3c7; color: #d97706; }");
  printWindow.document.write("</style></head><body>");
  printWindow.document.write('<div class="invoice">');
  printWindow.document.write('<div class="header"><div class="logo">🍽</div><div><div class="restaurant-name">' + invoice.restaurant.name + '</div>' + (invoice.restaurant.address ? '<div class="restaurant-info">' + invoice.restaurant.address + '</div>' : '') + (invoice.restaurant.phone ? '<div class="restaurant-info">Tel: ' + invoice.restaurant.phone + '</div>' : '') + '</div></div>');
  printWindow.document.write('<div class="invoice-meta"><div class="meta-item"><div class="meta-label">Invoice No.</div><div class="meta-value">' + invoiceNo + '</div></div><div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">' + invoiceDate + '</div></div><div class="meta-item"><div class="meta-label">Table</div><div class="meta-value">' + invoice.tableName + '</div></div>' + (invoice.payment ? '<div class="meta-item"><div class="meta-label">Payment</div><div class="meta-value"><span class="payment-status ' + (invoice.payment.status === "COMPLETED" ? "status-completed" : "status-pending") + '">' + invoice.payment.status + '</span></div></div>' : '') + '</div>');
  printWindow.document.write('<table><thead><tr><th style="width:40px">#</th><th>Item</th><th style="width:50px;text-align:center">Qty</th><th style="width:80px;text-align:right">Unit Price</th><th style="width:90px;text-align:right">Total</th></tr></thead><tbody>' + itemsHTML + '</tbody></table>');
  printWindow.document.write('<div class="totals"><div class="total-row"><span>Subtotal</span><span class="value">' + fmtPKR(invoice.subtotalCents) + '</span></div><div class="total-row"><span>Tax (' + invoice.taxRatePercent + '%)</span><span class="value">' + fmtPKR(invoice.taxCents) + '</span></div>' + (invoice.serviceChargeCents > 0 ? '<div class="total-row"><span>Service Charge</span><span class="value">' + fmtPKR(invoice.serviceChargeCents) + '</span></div>' : '') + '<div class="total-row grand"><span>Grand Total</span><span class="value">' + fmtPKR(invoice.totalCents) + '</span></div></div>');
  printWindow.document.write('<div class="footer">' + (invoice.restaurant.receipt_footer ? '<div class="footer-text">' + invoice.restaurant.receipt_footer + '</div>' : '') + '<div class="thank-you">Thank you for dining with us!</div></div>');
  printWindow.document.write('</div></body></html>');
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}
