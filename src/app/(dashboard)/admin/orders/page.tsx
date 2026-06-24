"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Printer,
  Download,
  Eye,
  Filter,
  Calendar,
  UtensilsCrossed,
} from "lucide-react";
import { getAllOrders, getOrderInvoice, type OrderHistoryItem, type OrderInvoiceData } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { ORDER_STATUS_LABEL, formatDate } from "@/lib/format";
import { statusColor } from "@/lib/theme/colors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types/db";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Orders" },
  { value: "PLACED", label: "Placed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PREPARING", label: "Preparing" },
  { value: "READY", label: "Ready" },
  { value: "SERVED", label: "Served" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<OrderHistoryItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getAllOrders(page, PAGE_SIZE, statusFilter);
      if (res.ok) {
        setOrders(res.data.orders);
        setTotal(res.data.total);
      } else {
        toast.error(res.error);
      }
      setLoading(false);
    }
    load();
  }, [page, statusFilter]);

  async function handlePrintInvoice(orderId: string) {
    const res = await getOrderInvoice(orderId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    printOrderInvoice(res.data);
  }

  async function handleDownloadInvoice(orderId: string) {
    const res = await getOrderInvoice(orderId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    printOrderInvoice(res.data);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <ShoppingBag className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Order History</h1>
          <p className="text-xs text-muted-foreground">
            {total} order{total !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Status filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="size-4 shrink-0 text-muted-foreground" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon="📦" title="No orders found" description="Orders will appear here once they are placed." />
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onView={() => setDetailOrder(order)}
                onPrint={() => handlePrintInvoice(order.id)}
                onDownload={() => handleDownloadInvoice(order.id)}
              />
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

      {/* Order detail dialog */}
      <OrderDetailDialog
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onPrint={() => detailOrder && handlePrintInvoice(detailOrder.id)}
        onDownload={() => detailOrder && handleDownloadInvoice(detailOrder.id)}
      />
    </div>
  );
}

function OrderRow({
  order,
  onView,
  onPrint,
  onDownload,
}: {
  order: OrderHistoryItem;
  onView: () => void;
  onPrint: () => void;
  onDownload: () => void;
}) {
  const color = statusColor(order.status);

  return (
    <Card className="overflow-hidden border-border/50 transition-all hover:shadow-md">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: color + "18", color }}
          >
            <Receipt className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm truncate">
                #{order.id.slice(0, 8).toUpperCase()}
              </p>
              <Badge
                variant="secondary"
                className="text-[10px] shrink-0"
                style={{
                  backgroundColor: color + "18",
                  color: color,
                  borderColor: color + "30",
                }}
              >
                {ORDER_STATUS_LABEL[order.status] ?? order.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UtensilsCrossed className="size-3" />
                {order.table_name ?? "Table"}
              </span>
              <span className="flex items-center gap-1">
                <ShoppingBag className="size-3" />
                {order.item_count} item{order.item_count !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDate(order.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Price cents={order.total_cents} className="text-base font-bold text-primary" />
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onView} title="View details">
              <Eye className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onPrint} title="Print invoice">
              <Printer className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onDownload} title="Download invoice">
              <Download className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderDetailDialog({
  order,
  onClose,
  onPrint,
  onDownload,
}: {
  order: OrderHistoryItem | null;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
}) {
  if (!order) return null;
  const color = statusColor(order.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            Order #{order.id.slice(0, 8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge
                variant="secondary"
                className="mt-1"
                style={{
                  backgroundColor: color + "18",
                  color: color,
                  borderColor: color + "30",
                }}
              >
                {ORDER_STATUS_LABEL[order.status] ?? order.status}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Table</p>
              <p className="font-bold text-sm">{order.table_name ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium text-sm">{formatDate(order.created_at)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Items</span>
              <span className="font-bold">{order.item_count}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">Total</span>
              <Price cents={order.total_cents} className="text-lg font-bold text-primary" />
            </div>
            {order.notes && (
              <div className="mt-3 rounded-md bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm mt-0.5">{order.notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onPrint}>
              <Printer className="mr-2 size-4" /> Print
            </Button>
            <Button variant="outline" className="flex-1" onClick={onDownload}>
              <Download className="mr-2 size-4" /> Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function printOrderInvoice(invoice: OrderInvoiceData) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to print invoices.");
    return;
  }

  const invoiceNo = `INV-${invoice.orderId.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("en-PK", {
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
  printWindow.document.write(".order-status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }");
  printWindow.document.write("</style></head><body>");
  printWindow.document.write('<div class="invoice">');
  printWindow.document.write('<div class="header"><div class="logo">🍽</div><div><div class="restaurant-name">' + invoice.restaurant.name + '</div>' + (invoice.restaurant.address ? '<div class="restaurant-info">' + invoice.restaurant.address + '</div>' : '') + (invoice.restaurant.phone ? '<div class="restaurant-info">Tel: ' + invoice.restaurant.phone + '</div>' : '') + '</div></div>');
  printWindow.document.write('<div class="invoice-meta"><div class="meta-item"><div class="meta-label">Invoice No.</div><div class="meta-value">' + invoiceNo + '</div></div><div class="meta-item"><div class="meta-label">Date</div><div class="meta-value">' + invoiceDate + '</div></div><div class="meta-item"><div class="meta-label">Table</div><div class="meta-value">' + invoice.tableName + '</div></div><div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">' + invoice.status + '</div></div></div>');
  printWindow.document.write('<table><thead><tr><th style="width:40px">#</th><th>Item</th><th style="width:50px;text-align:center">Qty</th><th style="width:80px;text-align:right">Unit Price</th><th style="width:90px;text-align:right">Total</th></tr></thead><tbody>' + itemsHTML + '</tbody></table>');
  printWindow.document.write('<div class="totals"><div class="total-row"><span>Subtotal</span><span class="value">' + fmtPKR(invoice.subtotalCents) + '</span></div><div class="total-row"><span>Tax (' + invoice.taxRatePercent + '%)</span><span class="value">' + fmtPKR(invoice.taxCents) + '</span></div>' + (invoice.serviceChargeCents > 0 ? '<div class="total-row"><span>Service Charge</span><span class="value">' + fmtPKR(invoice.serviceChargeCents) + '</span></div>' : '') + '<div class="total-row grand"><span>Grand Total</span><span class="value">' + fmtPKR(invoice.totalCents) + '</span></div></div>');
  printWindow.document.write('<div class="footer">' + (invoice.restaurant.receipt_footer ? '<div class="footer-text">' + invoice.restaurant.receipt_footer + '</div>' : '') + '<div class="thank-you">Thank you for dining with us!</div></div>');
  printWindow.document.write('</div></body></html>');
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}
