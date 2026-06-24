"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, Bell, Receipt, Star, CheckCircle2, Loader2, AlertCircle, UtensilsCrossed, ConciergeBell, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getMyOrderById, hasCompletedPayment } from "@/actions/customer";
import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWaiterRequest } from "@/actions/requests";
import { submitFeedback } from "@/actions/feedback";
import { ORDER_TIMELINE_STEPS, ORDER_STATUS_LABEL } from "@/lib/format";
import { statusColor } from "@/lib/theme/colors";
import type { Order, OrderItem } from "@/lib/types/db";
import { cn } from "@/lib/utils";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [paid, setPaid] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState(0);
  const [serviceChargeAmount, setServiceChargeAmount] = useState(0);
  const [waiterStatus, setWaiterStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [billStatus, setBillStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [requestError, setRequestError] = useState("");

  // Load order + items + subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [detailRes, paymentRes] = await Promise.all([
        getMyOrderById(id),
        hasCompletedPayment(),
      ]);

      if (!detailRes.ok) {
        setError(detailRes.error);
        setLoading(false);
        return;
      }

      setOrder(detailRes.data.order);
      setItems(detailRes.data.items);
      setPaid(paymentRes.ok ? paymentRes.data : false);
      setTaxRatePercent(detailRes.data.taxRatePercent);
      setServiceChargeAmount(detailRes.data.serviceChargeAmount);
      setLoading(false);
    }

    load();

    // Realtime: update order status as kitchen advances it
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...(payload.new as Partial<Order>) } : prev));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [...prev, payload.new as OrderItem]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const currentIdx = order
    ? ORDER_TIMELINE_STEPS.indexOf(order.status as typeof ORDER_TIMELINE_STEPS[number])
    : -1;

  // Feedback gating: only after SERVED or COMPLETED AND payment completed
  const showFeedback = order && ["SERVED", "COMPLETED"].includes(order.status) && paid;

  const subtotalCents = items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
  const taxCents = Math.round(subtotalCents * taxRatePercent / 100);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <div className="animate-pulse h-12 rounded-xl bg-muted" />
        <div className="animate-pulse h-24 rounded-2xl bg-muted" />
        <div className="animate-pulse h-32 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Order not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-card/95 px-4 py-3 backdrop-blur-md lg:px-0">
        <Link href="/orders" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-base font-bold text-app-ink">
          Order #{id.slice(0, 8)}
        </h1>
        <StatusBadge status={order.status} />
      </header>

      <div className="space-y-5 px-4 py-5 lg:px-0 lg:py-6">
        {/* Status timeline */}
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-xs">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Status</h2>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {ORDER_TIMELINE_STEPS.map((step, idx) => (
              <div key={step} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                      idx <= currentIdx
                        ? "text-white shadow-sm"
                        : "bg-muted text-muted-foreground",
                      idx === currentIdx && "ring-4 ring-primary/20",
                    )}
                    style={
                      idx <= currentIdx
                        ? { backgroundColor: statusColor(step) }
                        : undefined
                    }
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-semibold",
                      idx <= currentIdx ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {ORDER_STATUS_LABEL[step]?.split(" ").pop()}
                  </span>
                </div>
                {idx < ORDER_TIMELINE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-5 shrink-0 transition-colors",
                      idx < currentIdx ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-xs">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Items</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <div className="flex-1 space-y-0.5">
                  <div>
                    <span className="font-semibold text-app-ink">{item.name}</span>
                    <span className="ml-1.5 text-muted-foreground">×{item.quantity}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                  )}
                </div>
                <Price
                  cents={item.unit_price_cents * item.quantity}
                  className="font-bold text-app-ink"
                />
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <Price cents={subtotalCents} className="font-semibold text-app-ink" />
            </div>
            {taxRatePercent > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tax ({taxRatePercent}%)</span>
                <Price cents={taxCents} />
              </div>
            )}
            {serviceChargeAmount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Service Charge</span>
                <Price cents={serviceChargeAmount} />
              </div>
            )}
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-app-ink">Total</span>
            <Price cents={order.total_cents} className="text-lg font-extrabold text-primary" />
          </div>
        </div>

        {/* Request status banners */}
        {waiterStatus === "sent" && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Waiter has been called</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">A staff member will be with you shortly.</p>
            </div>
          </div>
        )}
        {waiterStatus === "error" && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">{requestError}</p>
          </div>
        )}
        {billStatus === "sent" && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Bill has been requested</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Your bill will be prepared and brought to your table.</p>
            </div>
          </div>
        )}
        {billStatus === "error" && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            <AlertCircle className="size-5 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">{requestError}</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            size="default"
            disabled={waiterStatus === "sending" || waiterStatus === "sent"}
            onClick={async () => {
              setWaiterStatus("sending");
              setRequestError("");
              const res = await createWaiterRequest("CALL_WAITER");
              if (res.ok) {
                setWaiterStatus("sent");
              } else {
                setWaiterStatus("error");
                setRequestError(res.error);
              }
            }}
          >
            {waiterStatus === "sending" ? (
              <><Loader2 className="size-4 mr-1.5 animate-spin" /> Calling...</>
            ) : waiterStatus === "sent" ? (
              <><CheckCircle2 className="size-4 mr-1.5" /> Called ✓</>
            ) : (
              <><Bell className="size-4 mr-1.5" /> Call Waiter</>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            size="default"
            disabled={billStatus === "sending" || billStatus === "sent"}
            onClick={async () => {
              setBillStatus("sending");
              setRequestError("");
              const res = await createWaiterRequest("REQUEST_BILL");
              if (res.ok) {
                setBillStatus("sent");
              } else {
                setBillStatus("error");
                setRequestError(res.error);
              }
            }}
          >
            {billStatus === "sending" ? (
              <><Loader2 className="size-4 mr-1.5 animate-spin" /> Requesting...</>
            ) : billStatus === "sent" ? (
              <><CheckCircle2 className="size-4 mr-1.5" /> Requested ✓</>
            ) : (
              <><Receipt className="size-4 mr-1.5" /> Request Bill</>
            )}
          </Button>
        </div>

        {/* Feedback (gated) */}
        {showFeedback && (
          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-xs">
            <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full rounded-xl" size="default">
                  <Star className="size-4 mr-1.5" /> Leave Feedback
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-center text-lg font-bold">How was your experience?</DialogTitle>
                  <DialogDescription className="text-center text-sm">
                    We'd love to hear your feedback to serve you better.
                  </DialogDescription>
                </DialogHeader>
                <FeedbackForm
                  orderId={order.id}
                  onClose={() => setFeedbackOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <Badge
      variant="secondary"
      className="rounded-lg px-2 py-0.5 text-[11px] font-semibold"
      style={{
        backgroundColor: color + "15",
        color: color,
        borderColor: color + "30",
      }}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function StarRating({ value, onChange, name }: { value: number; onChange: (v: number) => void; name: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          onMouseEnter={() => setHover(v)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
          aria-label={`${v} star${v > 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "size-8 transition-colors",
              (hover || value) >= v
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/30",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function FeedbackForm({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [food, setFood] = useState(0);
  const [service, setService] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (food === 0 || service === 0) {
      toast.error("Please rate both food and service.");
      return;
    }
    setSubmitting(true);
    const res = await submitFeedback({
      food_rating: food,
      service_rating: service,
      comment,
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      toast.error(res.error);
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <p className="text-lg font-bold text-foreground">Thank you!</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your feedback helps us improve. We hope to see you again soon!
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Food rating */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="size-4 text-primary" />
          <Label className="text-sm font-semibold">How was the food?</Label>
        </div>
        <StarRating value={food} onChange={setFood} name="food" />
      </div>

      {/* Service rating */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <ConciergeBell className="size-4 text-primary" />
          <Label className="text-sm font-semibold">How was the service?</Label>
        </div>
        <StarRating value={service} onChange={setService} name="service" />
      </div>

      {/* Comment */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <Label className="text-sm font-semibold">Anything else? <span className="font-normal text-muted-foreground">(optional)</span></Label>
        </div>
        <Textarea
          placeholder="Tell us about your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="rounded-xl resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 rounded-xl" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Submitting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Submit Feedback
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
