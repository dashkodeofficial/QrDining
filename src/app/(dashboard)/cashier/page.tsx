"use client";

import { useEffect, useState, useRef } from "react";
import {
  Banknote,
  CheckCircle2,
  Receipt,
  Printer,
  FileText,
  Clock,
  ChefHat,
  CreditCard,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPayments, generateBill, completePayment, getInvoice, type InvoiceData } from "@/actions/payments";
import { getTables } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

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

  async function handleInvoice(tableSessionId: string) {
    const res = await getInvoice(tableSessionId);
    if (res.ok) {
      setInvoice(res.data);
    } else {
      toast.error(res.error);
    }
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
            pending.map((p) => (
              <PaymentCard
                key={p.id}
                payment={p}
                onComplete={() => handleComplete(p.id)}
                onInvoice={() => handleInvoice(p.table_session_id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <EmptyState icon="🧾" title="No completed payments" description="Completed payments appear here." />
          ) : (
            completed.map((p) => (
              <PaymentCard
                key={p.id}
                payment={p}
                onInvoice={() => handleInvoice(p.table_session_id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="bills" className="mt-4 space-y-3">
          {billRequests.length === 0 ? (
            <EmptyState icon="🧾" title="No bill requests" description="Customers will request bills here." />
          ) : (
            billRequests.map((t) => (
              <Card key={t.id} className="overflow-hidden border-border/50">
                <div className="h-1 bg-orange-500" />
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30">
                      <FileText className="size-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.seat_capacity} seats</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleGenerateBill(t.id)}>
                    <FileText className="mr-1.5 size-4" /> Generate Bill
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <InvoiceDialog invoice={invoice} onClose={() => setInvoice(null)} />
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
  onInvoice,
}: {
  payment: Payment;
  onComplete?: () => void;
  onInvoice: () => void;
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
          <Button variant="outline" size="sm" className="flex-1" onClick={onInvoice}>
            <Receipt className="mr-1.5 size-4" /> Invoice
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

function InvoiceDialog({
  invoice,
  onClose,
}: {
  invoice: InvoiceData | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = ref.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #fff; }
        .invoice { max-width: 600px; margin: 0 auto; padding: 32px; }
        .header { display: flex; align-items: center; gap: 12px; padding-bottom: 20px; border-bottom: 2px solid #e23744; }
        .logo { width: 48px; height: 48px; border-radius: 12px; background: #e23744; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; }
        .restaurant-name { font-size: 20px; font-weight: 700; }
        .restaurant-info { font-size: 12px; color: #666; margin-top: 2px; }
        .invoice-meta { display: flex; justify-content: space-between; margin-top: 20px; padding: 12px 16px; background: #f8f8f8; border-radius: 8px; }
        .meta-item { font-size: 12px; }
        .meta-label { color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-value { font-weight: 600; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; padding: 8px 12px; border-bottom: 2px solid #eee; }
        td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
        .totals { margin-top: 16px; margin-left: auto; width: 240px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .total-row.grand { border-top: 2px solid #eee; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; }
        .total-row.grand .value { color: #e23744; }
        .footer { margin-top: 32px; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
        .footer-text { font-size: 12px; color: #666; }
        .thank-you { font-size: 14px; font-weight: 600; margin-top: 8px; color: #1a1a1a; }
        .payment-status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
        .status-completed { background: #dcfce7; color: #16a34a; }
        .status-pending { background: #fef3c7; color: #d97706; }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head><title>Invoice - ${invoice?.restaurant.name ?? "Restaurant"}</title>${styles}</head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  if (!invoice) return null;

  const invoiceNo = `INV-${invoice.sessionId.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            Invoice
          </DialogTitle>
        </DialogHeader>

        <div ref={ref} className="space-y-0">
          <div className="invoice">
            {/* Header */}
            <div className="header">
              <div className="logo">
                <ChefHat size={28} strokeWidth={2.5} />
              </div>
              <div>
                <div className="restaurant-name">{invoice.restaurant.name}</div>
                {invoice.restaurant.address && (
                  <div className="restaurant-info">{invoice.restaurant.address}</div>
                )}
                {invoice.restaurant.phone && (
                  <div className="restaurant-info">Tel: {invoice.restaurant.phone}</div>
                )}
              </div>
            </div>

            {/* Invoice meta */}
            <div className="invoice-meta">
              <div className="meta-item">
                <div className="meta-label">Invoice No.</div>
                <div className="meta-value">{invoiceNo}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Date</div>
                <div className="meta-value">{invoiceDate}</div>
              </div>
              <div className="meta-item">
                <div className="meta-label">Table</div>
                <div className="meta-value">{invoice.tableName}</div>
              </div>
              {invoice.payment && (
                <div className="meta-item">
                  <div className="meta-label">Payment</div>
                  <div className="meta-value">
                    <span className={`payment-status ${invoice.payment.status === "COMPLETED" ? "status-completed" : "status-pending"}`}>
                      {invoice.payment.status}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Items table */}
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>Item</th>
                  <th style={{ width: "50px", textAlign: "center" }}>Qty</th>
                  <th style={{ width: "80px", textAlign: "right" }}>Unit Price</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      {item.name}
                      {item.notes && (
                        <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right" }}>
                      {new Intl.NumberFormat("en-PK", {
                        style: "currency",
                        currency: "PKR",
                        minimumFractionDigits: 0,
                      }).format(item.unit_price_cents)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {new Intl.NumberFormat("en-PK", {
                        style: "currency",
                        currency: "PKR",
                        minimumFractionDigits: 0,
                      }).format(item.unit_price_cents * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span className="value">
                  {new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    minimumFractionDigits: 0,
                  }).format(invoice.subtotalCents)}
                </span>
              </div>
              <div className="total-row">
                <span>Tax ({invoice.taxRatePercent}%)</span>
                <span className="value">
                  {new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    minimumFractionDigits: 0,
                  }).format(invoice.taxCents)}
                </span>
              </div>
              {invoice.serviceChargeCents > 0 && (
                <div className="total-row">
                  <span>Service Charge</span>
                  <span className="value">
                    {new Intl.NumberFormat("en-PK", {
                      style: "currency",
                      currency: "PKR",
                      minimumFractionDigits: 0,
                    }).format(invoice.serviceChargeCents)}
                  </span>
                </div>
              )}
              <div className="total-row grand">
                <span>Grand Total</span>
                <span className="value">
                  {new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    minimumFractionDigits: 0,
                  }).format(invoice.totalCents)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="footer">
              {invoice.restaurant.receipt_footer && (
                <div className="footer-text">{invoice.restaurant.receipt_footer}</div>
              )}
              <div className="thank-you">Thank you for dining with us!</div>
            </div>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full">
          <Printer className="mr-2 size-4" /> Print Invoice
        </Button>
      </DialogContent>
    </Dialog>
  );
}
