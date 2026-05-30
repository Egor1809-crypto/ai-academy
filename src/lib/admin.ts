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
