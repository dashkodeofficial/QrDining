"use client";

import { useEffect, useState, useRef } from "react";
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Printer,
  ChefHat,
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
  const [invoice, setInvoice] = useState<OrderInvoiceData | null>(null);

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

  async function handleInvoice(orderId: string) {
    const res = await getOrderInvoice(orderId);
    if (res.ok) {
      setInvoice(res.data);
    } else {
      toast.error(res.error);
    }
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
                onInvoice={() => handleInvoice(order.id)}
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
        onInvoice={() => detailOrder && handleInvoice(detailOrder.id)}
      />

      {/* Invoice dialog */}
      <InvoicePrintDialog invoice={invoice} onClose={() => setInvoice(null)} />
    </div>
  );
}

function OrderRow({
  order,
  onView,
  onInvoice,
}: {
  order: OrderHistoryItem;
  onView: () => void;
  onInvoice: () => void;
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
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onView}>
              <Eye className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onInvoice}>
              <Receipt className="size-4" />
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
  onInvoice,
}: {
  order: OrderHistoryItem | null;
  onClose: () => void;
  onInvoice: () => void;
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

          <Button onClick={onInvoice} className="w-full">
            <Receipt className="mr-2 size-4" /> Download Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoicePrintDialog({
  invoice,
  onClose,
}: {
  invoice: OrderInvoiceData | null;
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
        .order-status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
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

  const invoiceNo = `INV-${invoice.orderId.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const statusColorVal = statusColor(invoice.status);

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
              <div className="meta-item">
                <div className="meta-label">Status</div>
                <div className="meta-value">
                  <span className="order-status" style={{ backgroundColor: statusColorVal + "20", color: statusColorVal }}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>

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
