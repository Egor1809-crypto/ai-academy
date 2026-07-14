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
 * Deterministic 2-digit verification nonce derived from a Telegram auth code.
 * Shown identically in the initiating BROWSER and in the BOT's confirmation
 * prompt so the human can match them (like GitHub device-login number matching).
 * A phishing victim who never opened the site sees a number matching nothing on
 * their screen → declines. The bot duplicates this exact derivation.
 */
export function authNonce(code: string): string {
  const h = createHash("sha256").update(code).digest("hex").slice(0, 6);
  return String(parseInt(h, 16) % 100).padStart(2, "0");
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

/**
 * Reject oversized request bodies BEFORE buffering/parsing them.
 * Guards against memory-exhaustion DoS via huge JSON payloads.
 * Returns true if the declared Content-Length exceeds maxBytes.
 */
export function bodyTooLarge(req: Request, maxBytes: number): boolean {
  const raw = req.headers.get("content-length");
  if (!raw) return false; // length unknown — per-field caps still apply downstream
  const len = Number(raw);
  return Number.isFinite(len) && len > maxBytes;
}

/**
 * Normalize a phone number to digits only (for dedup / comparison).
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Coarsen an IP for storage as consent evidence (152-ФЗ, минимизация по ст.5).
 * We only need to prove *that* consent was given, when, and against which document
 * version — the exact host is not required. Drop the last IPv4 octet (/24) or keep
 * only the first four IPv6 hextets (/64). Non-IP tokens ("unknown") pass through
 * capped to the column width. Returns null for empty input.
 */
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v = ip.trim();
  if (!v) return null;
  if (v.includes(":")) {
    // IPv6 → сеть /64. BUG_FIX_CONTEXT: раньше делали split(":").slice(0,4).filter(Boolean),
    // но filter(Boolean) выбрасывал пустую группу от «::»-сжатия и сдвигал хекстеты
    // (fe80::1 → «fe80:1::» — ЧУЖАЯ сеть). Теперь корректно раскрываем «::» до 8 групп
    // и берём первые 4.
    const [head, tail] = v.split("::");
    const headParts = head ? head.split(":").filter(Boolean) : [];
    let groups: string[];
    if (tail === undefined) {
      // Нет «::» — адрес уже полный (или мусор): берём как есть.
      groups = v.split(":").filter(Boolean);
    } else {
      const tailParts = tail ? tail.split(":").filter(Boolean) : [];
      const missing = Math.max(0, 8 - headParts.length - tailParts.length);
      groups = [...headParts, ...Array(missing).fill("0"), ...tailParts];
    }
    const prefix = groups.slice(0, 4);
    while (prefix.length < 4) prefix.push("0");
    return `${prefix.join(":")}::`;
  }
  const octets = v.split(".");
  if (octets.length === 4 && octets.every((o) => /^\d{1,3}$/.test(o))) {
    return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
  }
  return v.slice(0, 64);
}

/**
 * Same-origin check for state-changing / cookie-minting requests (defense-in-depth
 * over the sameSite cookie). A cross-site browser POST always carries an Origin that
 * won't match ours → rejected. No Origin (non-browser: bot / server-to-server, or a
 * same-tab navigation) passes — those aren't browser-CSRF and are gated elsewhere.
 */
const ALLOWED_ORIGIN_HOSTS = new Set([
  "expertum.pro",
  "www.expertum.pro",
  "localhost:3099",
  "127.0.0.1:3099",
]);
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return ALLOWED_ORIGIN_HOSTS.has(new URL(origin).host);
  } catch {
    return false;
  }
}
