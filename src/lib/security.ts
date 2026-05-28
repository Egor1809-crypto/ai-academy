import { timingSafeEqual } from "crypto";

/**
 * Timing-safe string comparison.
 * Prevents timing attacks on password/token checks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Pad to same length to avoid leaking length info via timing
    const maxLen = Math.max(a.length, b.length);
    a = a.padEnd(maxLen, "\0");
    b = b.padEnd(maxLen, "\0");
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
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
