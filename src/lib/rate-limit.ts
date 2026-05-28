/**
 * In-memory sliding-window rate limiter.
 *
 * Stores request timestamps per IP in a Map.
 * Suitable for single-instance deployments (covers our case).
 * For multi-instance — swap to Redis-backed approach.
 */

interface RateLimitEntry {
  timestamps: number[];
}

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
 * Extract client IP from Next.js request.
 * Checks x-forwarded-for (reverse proxy), x-real-ip, then falls back to "unknown".
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be comma-separated; first is the client
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
