import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

// Polling — allow frequent checks but cap abuse
const limiter = createRateLimiter("tg-auth-status", { limit: 120, windowSeconds: 60 });

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json({ status: "ratelimited" }, { status: 429 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ status: "notfound" }, { status: 400 });
  }

  try {
    const authCode = await prisma.authCode.findUnique({ where: { code } });
    if (!authCode) {
      return NextResponse.json({ status: "notfound" });
    }

    // Already consumed by this browser earlier — treat as confirmed.
    if (authCode.consumedAt) {
      return NextResponse.json({ status: "confirmed" });
    }

    if (!authCode.confirmedAt) {
      if (authCode.expiresAt < new Date()) {
        return NextResponse.json({ status: "expired" });
      }
      return NextResponse.json({ status: "pending" });
    }

    // Confirmed by the bot — create the session for this browser now.
    if (!authCode.telegramId) {
      return NextResponse.json({ status: "expired" });
    }
    const user = await prisma.user.findUnique({ where: { telegramId: authCode.telegramId } });
    if (!user) {
      return NextResponse.json({ status: "expired" });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    await prisma.authCode.update({
      where: { code },
      data: { consumedAt: new Date() },
    });

    return NextResponse.json({ status: "confirmed" });
  } catch (error) {
    console.error("Telegram auth status error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
