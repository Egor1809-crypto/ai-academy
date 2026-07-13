import { safeCompare } from "./security";
import { getCurrentUser } from "./auth";

/**
 * Legacy shared-secret admin check (x-admin-password vs ADMIN_PASSWORD).
 * DEPRECATED for the web admin — the panel now authenticates via the session
 * cookie + role (see requireAdmin). Kept only in case a genuine machine caller
 * ever needs it; no browser-facing route uses it anymore. ADMIN_PASSWORD can be
 * retired from the environment once nothing references this.
 */
export function isAdminRequest(req: Request): boolean {
  const password = req.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!password || !adminPassword) return false;
  return safeCompare(password, adminPassword);
}

/**
 * Server-to-server auth for bot→site calls (telegram/confirm, bot/broadcasts).
 * Requires the DEDICATED BOT_SHARED_SECRET (`x-bot-secret`). The legacy
 * ADMIN_PASSWORD fallback was REMOVED: that secret is exposed to the browser and
 * could forge these privileged endpoints (the Telegram account-takeover vector).
 * These endpoints are also restricted to loopback at the nginx layer.
 */
export function isBotRequest(req: Request): boolean {
  const botSecret = process.env.BOT_SHARED_SECRET;
  const provided = req.headers.get("x-bot-secret");
  return !!(botSecret && provided && safeCompare(provided, botSecret));
}

/**
 * Authorize a privileged WEB (browser) request by the SESSION user's role.
 * Replaces the browser-held x-admin-password scheme: the admin signs in normally
 * (session cookie is httpOnly + Secure), and role is read live from the DB on
 * every check. Use inside route handlers / server components only.
 */
export async function requireAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
