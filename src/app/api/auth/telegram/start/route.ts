import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "ailegal_academy_bot";
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// 10 starts per 5 min per IP
const limiter = createRateLimiter("tg-auth-start", { limit: 10, windowSeconds: 300 });

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const code = randomBytes(24).toString("hex"); // 48 chars
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await prisma.authCode.create({ data: { code, expiresAt } });

    const deepLink = `https://t.me/${BOT_USERNAME}?start=auth_${code}`;
    return NextResponse.json({ code, deepLink });
  } catch (error) {
    console.error("Telegram auth start error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
