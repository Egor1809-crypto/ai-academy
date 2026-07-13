import { safeCompare } from "./security";

/**
 * Server-to-server auth for bot→site calls (telegram/confirm, bot/broadcasts).
 * Requires the DEDICATED BOT_SHARED_SECRET (`x-bot-secret`). These endpoints are
 * also restricted to loopback at the nginx layer.
 *
 * The web admin panel (and its ADMIN_PASSWORD / session-role checks) was removed —
 * admin now lives at the partner panel tech-pravo.ru. ADMIN_PASSWORD is no longer
 * referenced anywhere and can be dropped from the environment.
 */
export function isBotRequest(req: Request): boolean {
  const botSecret = process.env.BOT_SHARED_SECRET;
  const provided = req.headers.get("x-bot-secret");
  return !!(botSecret && provided && safeCompare(provided, botSecret));
}
