import { safeCompare } from "./security";

/**
 * Server-to-server / admin auth via the shared ADMIN_PASSWORD secret, sent in
 * the `x-admin-password` header. Used by the web admin panel and the bot.
 */
export function isAdminRequest(req: Request): boolean {
  const password = req.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!password || !adminPassword) return false;
  return safeCompare(password, adminPassword);
}

/**
 * Server-to-server auth for bot→site calls (telegram/confirm, bot/broadcasts).
 * Prefers a DEDICATED BOT_SHARED_SECRET (`x-bot-secret`) so the browser-exposed
 * ADMIN_PASSWORD can no longer forge these privileged S2S endpoints (the
 * account-takeover vector). Falls back to the legacy ADMIN_PASSWORD header for
 * a zero-downtime transition; once BOT_SHARED_SECRET is set everywhere and the
 * bot is updated, the fallback is effectively unused. These endpoints are also
 * restricted to loopback at the nginx layer (defense in depth).
 */
export function isBotRequest(req: Request): boolean {
  const botSecret = process.env.BOT_SHARED_SECRET;
  const provided = req.headers.get("x-bot-secret");
  if (botSecret && provided && safeCompare(provided, botSecret)) return true;
  // Backward-compat: legacy shared ADMIN_PASSWORD header.
  return isAdminRequest(req);
}
