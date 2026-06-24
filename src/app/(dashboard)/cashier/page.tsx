"use client";

import { useEffect, useState, useRef } from "react";
import { Banknote, CheckCircle2, Receipt, Printer, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPayments, generateBill, completePayment, getInvoice } from "@/actions/payments";
import { getTables } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { formatDate } from "@/lib/format";
import { statusColor } from "@/lib/theme/colors";
import { toast } from "sonner";
import type { Payment, RestaurantTable } from "@/lib/types/db";

export default function CashierDashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<{
    sessionId: string;
    tableName: string;
    items: { name: string; quantity: number; unit_price_cents: number; notes: string | null }[];
    totalCents: number;
  } | null>(null);

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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Banknote className="size-6 text-primary" />
        <h1 className="text-xl font-bold text-app-ink">Cashier Dashboard</h1>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="pending" className="flex-1">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="bills" className="flex-1">
            Bill Requests ({billRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
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

        <TabsContent value="completed" className="space-y-3">
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

        <TabsContent value="bills" className="space-y-3">
          {billRequests.length === 0 ? (
            <EmptyState icon="🧾" title="No bill requests" description="Customers will request bills here." />
          ) : (
            billRequests.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.seat_capacity} seats</p>
                  </div>
                  <Button size="sm" onClick={() => handleGenerateBill(t.id)}>
                    <FileText className="mr-1 size-4" /> Generate Bill
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="font-bold">Payment #{payment.id.slice(0, 8)}</span>
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
        <p className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Price cents={payment.amount_cents} className="text-lg font-bold text-primary" />
          <span className="text-xs text-muted-foreground">{payment.method}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onInvoice}>
            <Receipt className="mr-1 size-4" /> Invoice
          </Button>
          {isPending && onComplete && (
            <Button size="sm" className="flex-1" onClick={onComplete}>
              <CheckCircle2 className="mr-1 size-4" /> Paid
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
  invoice: {
    sessionId: string;
    tableName: string;
    items: { name: string; quantity: number; unit_price_cents: number; notes: string | null }[];
    totalCents: number;
  } | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = ref.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Invoice</title></head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  if (!invoice) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice</DialogTitle>
        </DialogHeader>
        <div ref={ref} className="space-y-4 p-2">
          <div className="text-center">
            <h2 className="text-lg font-bold">{invoice.tableName}</h2>
            <p className="text-xs text-muted-foreground">Session #{invoice.sessionId.slice(0, 8)}</p>
          </div>
          <div className="space-y-2">
            {invoice.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div>
                  <span>{item.name}</span>
                  <span className="ml-1 text-muted-foreground">×{item.quantity}</span>
                </div>
                <Price cents={item.unit_price_cents * item.quantity} />
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span>
            <Price cents={invoice.totalCents} />
          </div>
        </div>
        <Button onClick={handlePrint} className="w-full">
          <Printer className="mr-2 size-4" /> Print
        </Button>
      </DialogContent>
    </Dialog>
  );
}
