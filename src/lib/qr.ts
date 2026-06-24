import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Generate a cryptographically-secure, opaque QR token.
 *
 * 32 random bytes → 64-char hex string. Tokens are unguessable and carry no
 * information about the table they map to (the mapping lives only in the
 * `qr_tokens` table). This is the anti-spoofing primitive: a customer can
 * never derive or edit a table_id from the URL.
 */
export function generateQrToken(): string {
  return randomBytes(32).toString("hex");
}
