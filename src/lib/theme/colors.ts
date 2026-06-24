/**
 * Bold Red & White — JS-side theme source of truth.
 *
 * Mirrors the CSS variables in `src/app/globals.css`. Use these for any
 * JS-rendered color (QR code fills, chart palettes, canvas, inline SVG).
 * For component styling, always prefer the semantic Tailwind tokens
 * (`bg-primary`, `text-success`, etc.) which read from the same CSS vars.
 *
 * To rebrand the app, edit this file AND `src/app/globals.css` together.
 */

export const brandColors = {
  primary: "#e23744",
  accent: "#f97316",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  surface: "#f8f8f8",
  ink: "#1a1a1a",
} as const;

/** Categorical palette for charts, ordered by prominence. */
export const chartPalette = [
  brandColors.primary,
  brandColors.accent,
  brandColors.success,
  brandColors.warning,
  brandColors.info,
] as const;

export type BrandColor = keyof typeof brandColors;

/**
 * Status → brand color mapping, reused across customer tracking,
 * kitchen board, and admin tables for a consistent visual language.
 * Components should pull from here instead of hardcoding per-status colors.
 */
export const statusColors: Record<string, BrandColor> = {
  // Order lifecycle
  PLACED: "info",
  ACCEPTED: "info",
  PREPARING: "warning",
  READY: "accent",
  SERVED: "primary",
  COMPLETED: "success",
  CANCELLED: "danger",
  // Table lifecycle
  AVAILABLE: "success",
  OCCUPIED: "primary",
  BILL_REQUESTED: "warning",
  PAYMENT_PENDING: "warning",
  CLEANING: "info",
} as const;

export function statusColor(status: string): string {
  const key = statusColors[status] ?? "info";
  return brandColors[key];
}
