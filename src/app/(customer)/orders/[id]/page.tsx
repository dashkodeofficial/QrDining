"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, Bell, Receipt, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getMyOrderById, hasCompletedPayment } from "@/actions/customer";
import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
          <div className="flex justify-between text-sm font-bold">
            <span className="text-app-ink">Total</span>
            <Price cents={order.total_cents} className="text-lg font-extrabold text-primary" />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            size="default"
            onClick={async () => {
              const res = await createWaiterRequest("CALL_WAITER");
              toast[res.ok ? "success" : "error"](
                res.ok ? "Waiter called!" : res.error,
              );
            }}
          >
            <Bell className="size-4 mr-1.5" /> Call Waiter
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            size="default"
            onClick={async () => {
              const res = await createWaiterRequest("REQUEST_BILL");
              toast[res.ok ? "success" : "error"](
                res.ok ? "Bill requested!" : res.error,
              );
            }}
          >
            <Receipt className="size-4 mr-1.5" /> Request Bill
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
              <DialogContent className="max-w-sm rounded-2xl">
                <DialogHeader>
                  <DialogTitle>How was everything?</DialogTitle>
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

function FeedbackForm({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [food, setFood] = useState("3");
  const [service, setService] = useState("3");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await submitFeedback({
      food_rating: Number(food),
      service_rating: Number(service),
      comment,
    });
    if (res.ok) {
      toast.success("Thank you for your feedback!");
      onClose();
    } else {
      toast.error(res.error);
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Food Rating</Label>
        <RadioGroup value={food} onValueChange={setFood} className="flex gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <Label
              key={v}
              htmlFor={`food-${v}`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-border text-sm font-medium transition-colors has-[[checked]]:border-primary has-[[checked]]:bg-primary has-[[checked]]:text-primary-foreground"
            >
              <RadioGroupItem value={String(v)} id={`food-${v}`} className="sr-only" />
              {v}
            </Label>
          ))}
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label>Service Rating</Label>
        <RadioGroup value={service} onValueChange={setService} className="flex gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <Label
              key={v}
              htmlFor={`service-${v}`}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-border text-sm font-medium transition-colors has-[[checked]]:border-primary has-[[checked]]:bg-primary has-[[checked]]:text-primary-foreground"
            >
              <RadioGroupItem value={String(v)} id={`service-${v}`} className="sr-only" />
              {v}
            </Label>
          ))}
        </RadioGroup>
      </div>
      <Textarea
        placeholder="Tell us about your experience..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="rounded-xl"
      />
      <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Feedback"}
      </Button>
    </form>
  );
}
