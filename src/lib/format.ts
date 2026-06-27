/** Display + domain helpers shared across customer and staff UI. */

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY_CODE ?? "PKR";
const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "en-PK";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Integer rupees → "Rs. 1,250" string. */
export function formatPrice(rupees: number): string {
  return currencyFormatter.format(rupees);
}

export function sumCartTotal(items: { unit_price_cents: number; quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
}

/** "2m ago", "just now", etc. — for elapsed time on the kitchen board. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/** Elapsed minutes since a timestamp — used for "delayed order" highlighting. */
export function elapsedMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** A friendly label for each order-status enum value. */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  PLACED: "Order Placed",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Ordered steps for the customer-facing status timeline. */
export const ORDER_TIMELINE_STEPS = [
  "PLACED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
] as const;

export const WAITER_REQUEST_LABEL: Record<string, string> = {
  CALL_WAITER: "Call Waiter",
  NEED_WATER: "Need Water",
  NEED_CUTLERY: "Need Cutlery",
  NEED_ASSISTANCE: "Need Assistance",
  REQUEST_BILL: "Request Bill",
};
