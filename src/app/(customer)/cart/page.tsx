"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ArrowLeft, UtensilsCrossed, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "@/components/shared/quantity-stepper";
import { Price } from "@/components/shared/price";
import { EmptyState } from "@/components/shared/empty-state";
import { useCart } from "@/stores/cart";
import { placeOrder } from "@/actions/orders";
import { useAdmin } from "@/components/customer/admin-context";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function CartPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQuantity);
  const setNotes = useCart((s) => s.setNotes);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const totalCents = useCart((s) => s.totalCents());
  const count = useCart((s) => s.count());
  const [orderNotes, setOrderNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const { isAdmin, selectedTableId } = useAdmin();

  async function handlePlaceOrder() {
    if (isAdmin && !selectedTableId) {
      toast.error("Please select a table on the menu page before placing an order.");
      return;
    }
    setPlacing(true);
    const result = await placeOrder({
      items: lines.map((l) => ({
        menu_item_id: l.menu_item_id,
        name: l.name,
        unit_price_cents: l.unit_price_cents,
        quantity: l.quantity,
        notes: l.notes,
      })),
      notes: orderNotes,
      tableId: isAdmin ? selectedTableId : undefined,
    });

    if (!result.ok) {
      toast.error(result.error);
      setPlacing(false);
      return;
    }

    clear();
    toast.success("Order placed!");
    router.push(`/orders/${result.data.orderId}`);
  }

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-80px)] flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <Link href="/menu" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-base font-bold text-app-ink">Cart</h1>
        </header>
        <div className="flex flex-1 items-center justify-center px-4">
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Browse the menu and add items to get started."
            action={
              <Link href="/menu">
                <Button className="rounded-xl"><UtensilsCrossed className="mr-2 size-4" />Browse Menu</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link href="/menu" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-base font-bold text-app-ink">Your Cart</h1>
        <span className="ml-auto text-sm font-semibold text-muted-foreground">{count} item{count > 1 ? "s" : ""}</span>
      </header>

      {/* Desktop header */}
      <header className="sticky top-0 z-30 hidden border-b border-border/40 bg-card/95 px-8 py-4 backdrop-blur-md lg:block">
        <div className="flex items-center gap-3">
          <Link href="/menu" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <ShoppingBag className="size-5 text-primary" />
          <h1 className="text-lg font-bold text-app-ink">Your Cart</h1>
          <span className="ml-auto text-sm font-semibold text-muted-foreground">{count} item{count > 1 ? "s" : ""}</span>
        </div>
      </header>

      <div className="flex flex-col gap-6 px-4 py-5 lg:flex-row lg:gap-8 lg:px-8 lg:py-8">
        {/* Items */}
        <div className="min-w-0 flex-1 space-y-3 lg:space-y-4">
          {lines.map((line) => (
            <div key={line.menu_item_id} className="flex gap-4 rounded-2xl border border-border/50 bg-card p-4 shadow-xs transition-shadow hover:shadow-sm">
              {line.image_url ? (
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  <img src={line.image_url} alt={line.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">🍴</div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-bold text-app-ink">{line.name}</span>
                  <button
                    type="button"
                    onClick={() => remove(line.menu_item_id)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <Price cents={line.unit_price_cents} className="text-xs text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Special instructions..."
                  value={line.notes}
                  onChange={(e) => setNotes(line.menu_item_id, e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center justify-between">
                  <QuantityStepper value={line.quantity} onChange={(q) => setQty(line.menu_item_id, q)} size="sm" />
                  <Price cents={line.unit_price_cents * line.quantity} className="text-sm font-extrabold text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="shrink-0 lg:w-80">
          <div className="sticky top-20 space-y-5 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({count} item{count > 1 ? "s" : ""})</span>
                <Price cents={totalCents} className="font-semibold text-app-ink" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="order-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order notes (optional)</Label>
              <Textarea
                id="order-notes"
                placeholder="Table-side requests, allergies..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex justify-between text-base font-bold">
                <span className="text-app-ink">Total</span>
                <Price cents={totalCents} className="text-primary" />
              </div>
              <Button className="h-12 w-full rounded-xl text-sm font-bold" size="lg" onClick={handlePlaceOrder} disabled={placing}>
                {placing ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Placing Order...
                  </span>
                ) : (
                  "Place Order"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
