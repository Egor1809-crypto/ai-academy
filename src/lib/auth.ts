import { cookies } from "next/headers";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { prisma } from "./prisma";

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE = "session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Hash a password with scrypt (built into Node — no external deps).
 * Format: "<salt-hex>:<derived-hex>". A fresh random salt per password.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/** Constant-time verification of a password against a stored scrypt hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}

/**
 * Throwaway hash of the correct format (16-byte salt : 64-byte key), generated
 * once per process. Login verifies against this when the account or its
 * passwordHash is absent, so exactly one scrypt always runs regardless of whether
 * the email exists — equalizing response time and closing the account-enumeration
 * timing side-channel. It can never match a real password (the key is random).
 */
export const DUMMY_PASSWORD_HASH = `${randomBytes(16).toString("hex")}:${randomBytes(64).toString("hex")}`;

/** Create a DB-backed session and return its opaque token. */
export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex"); // 64 hex chars
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: token, userId, expiresAt } });
  return token;
}

/** Write the session cookie (httpOnly, lax). Only valid in route handlers / server actions. */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export type SessionUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  tariff: string | null;
  role: string;
};

/** Resolve the currently logged-in user from the session cookie, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    telegramId: u.telegramId,
    telegramUsername: u.telegramUsername,
    tariff: u.tariff,
    role: u.role,
  };
}

/** Delete the current session (DB row + cookie). Use in logout route handler. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
    store.delete(SESSION_COOKIE);
  }
}

// ── Telegram-login owner binding ────────────────────────────────
// The browser that starts the TG-login flow gets an httpOnly cookie holding a
// random owner token, which is also stored on the AuthCode row. `status` mints a
// session only when the cookie matches — so knowing the code alone (e.g. via an
// <img src=".../status?code=…"> forced on a victim's browser) can no longer claim
// the session. Closes the session-fixation / account-takeover vector.
const TG_OWNER_COOKIE = "tg_auth_owner";
const TG_OWNER_TTL_S = 5 * 60; // matches the auth-code TTL

export async function setAuthOwnerCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(TG_OWNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TG_OWNER_TTL_S,
  });
}

export async function getAuthOwnerToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TG_OWNER_COOKIE)?.value ?? null;
}

export async function clearAuthOwnerCookie(): Promise<void> {
  const store = await cookies();
  store.delete(TG_OWNER_COOKIE);
}
