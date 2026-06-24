/**
 * Build the absolute customer URL embedded in a printed QR code.
 * Uses NEXT_PUBLIC_SITE_URL when available so printed codes survive deployment.
 * This is safe to import from client components.
 */
export function buildQrUrl(token: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  ).replace(/\/$/, "");
  return `${base}/qr/${token}`;
}
