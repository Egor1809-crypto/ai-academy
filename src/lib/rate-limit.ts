/**
 * In-memory sliding-window rate limiter.
 *
 * Stores request timestamps per IP in a Map.
 * Suitable for single-instance deployments (covers our case).
 * For multi-instance — swap to Redis-backed approach.
 */

import { truncateIp } from "./security";

interface RateLimitEntry {
  timestamps: number[];
}

// Hard cap on distinct keys per limiter. Even with /64 keying a wide spread of
// source networks could otherwise grow the Map until the process hits PM2's
// max_memory_restart and the in-memory global counters reset — disarming the only
// cost ceiling. Over the cap we evict the least-recently-active tenth.
const MAX_KEYS = 20_000;

interface RateLimiterOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Creates a named rate limiter with the given options.
 * Each limiter has its own isolated store.
 */
export function createRateLimiter(name: string, options: RateLimiterOptions) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  // Cleanup stale entries every 60s to prevent memory leaks
  const CLEANUP_INTERVAL = 60_000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    const cutoff = now - options.windowSeconds * 1000;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }

  return {
    /**
     * Check if a request from the given key (IP) is allowed.
     * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
     */
    check(key: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
      cleanup();

      // Bound distinct-key growth (see MAX_KEYS). Only fires when already over the
      // cap, then drops ~10% of the least-recently-active keys.
      if (store.size > MAX_KEYS) {
        const byRecency = [...store.entries()].sort(
          (a, b) => (a[1].timestamps[a[1].timestamps.length - 1] ?? 0) - (b[1].timestamps[b[1].timestamps.length - 1] ?? 0),
        );
        const evict = Math.ceil(MAX_KEYS * 0.1);
        for (let i = 0; i < evict && i < byRecency.length; i++) store.delete(byRecency[i][0]);
      }

      const now = Date.now();
      const windowMs = options.windowSeconds * 1000;
      const cutoff = now - windowMs;

      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

      if (entry.timestamps.length >= options.limit) {
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = oldestInWindow + windowMs - now;
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        };
      }

      entry.timestamps.push(now);
      return { allowed: true };
    },
  };
}

/**
 * Number of trusted reverse proxies in front of the app.
 * x-forwarded-for is a client-appendable chain: a request arrives as
 *   [spoofed values from client...] , [real client IP added by our edge] , [internal hops]
 * so the genuine client IP is the Nth-from-the-right entry, where N = trusted hops.
 * Configure via TRUSTED_PROXY_HOPS (default 1 — a single edge proxy like Vercel/nginx).
 * Reading the rightmost trusted hop prevents clients from spoofing arbitrary IPs
 * to win a fresh rate-limit bucket on every request.
 */
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1));

/**
 * Extract client IP from a Next.js request.
 * Trusts only the rightmost N entries of x-forwarded-for (N = TRUSTED_PROXY_HOPS),
 * since everything to the left can be forged by the client.
 */
export function getClientIP(req: Request): string {
  let raw = "";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      // Take the entry our own trusted proxy appended (Nth from the right).
      raw = parts[Math.max(0, parts.length - TRUSTED_PROXY_HOPS)];
    }
  }
  if (!raw) {
    const realIp = req.headers.get("x-real-ip");
    if (realIp) raw = realIp.trim();
  }
  if (!raw) raw = "unknown";

  // IPv6 → /64 network. A client with a routed /64 (standard on cheap VPS)
  // otherwise rotates source addresses to win a fresh rate-limit bucket every
  // request; collapsing to the /64 makes the whole allocation share one bucket.
  // IPv4 is kept full (a /24 would unfairly bucket entire NATs together).
  // truncateIp already expands "::" correctly and returns the /64 as "<4 hextets>::".
  // Audit callers pass this through truncateIp again (idempotent for IPv6, /24 for IPv4).
  if (raw.includes(":")) return truncateIp(raw) ?? raw;
  return raw;
}
