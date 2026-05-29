import { createHash, timingSafeEqual } from "crypto";

/**
 * Timing-safe string comparison.
 * Both inputs are SHA-256 hashed first, so the buffers are always equal length
 * (32 bytes) — this removes any timing/length side channel and lets us compare
 * secrets of differing lengths without leaking which one is longer.
 */
export function safeCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Sanitize user input: strip HTML tags, trim whitespace, limit length.
 */
export function sanitizeInput(input: string, maxLength = 500): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML
    .replace(/[<>]/g, "")    // remove stray angle brackets
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate phone number: 10-12 digits after stripping non-digits.
 */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 12;
}

/**
 * Validate email (basic, non-empty check).
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
