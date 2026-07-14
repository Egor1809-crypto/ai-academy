import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, getAuthOwnerToken, clearAuthOwnerCookie } from "@/lib/auth";
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

    // Already consumed by an earlier poll of this same browser — the session was
    // minted on that response; just report confirmed.
    if (authCode.consumedAt) {
      return NextResponse.json({ status: "confirmed" });
    }

    if (!authCode.confirmedAt) {
      if (authCode.expiresAt < new Date()) {
        return NextResponse.json({ status: "expired" });
      }
      return NextResponse.json({ status: "pending" });
    }

    // Confirmed by the bot and not yet consumed. Claim it ATOMICALLY and ONE-TIME:
    // the conditional updateMany lets exactly one concurrent request win (closing the
    // race where two polls both mint a session) and enforces not-expired in the same
    // statement, so a confirmed-but-expired code can no longer create a session.
    // Owner binding: only the browser that initiated /start (and holds the matching
    // httpOnly cookie) may claim the session. Without it, knowing the code is not
    // enough to mint a session — closes the session-fixation / ATO vector.
    const owner = await getAuthOwnerToken();
    if (!owner) {
      return NextResponse.json({ status: "pending" });
    }
    const now = new Date();
    const claim = await prisma.authCode.updateMany({
      where: { code, consumedAt: null, confirmedAt: { not: null }, expiresAt: { gt: now }, ownerToken: owner },
      data: { consumedAt: now },
    });
    if (claim.count !== 1) {
      // Lost the race, or the code expired between read and claim — resolve real state.
      const fresh = await prisma.authCode.findUnique({ where: { code } });
      return NextResponse.json({ status: fresh?.consumedAt ? "confirmed" : "expired" });
    }

    // We hold the exclusive claim → mint the session for this browser.
    if (!authCode.telegramId) {
      return NextResponse.json({ status: "expired" });
    }
    const user = await prisma.user.findUnique({ where: { telegramId: authCode.telegramId } });
    if (!user) {
      return NextResponse.json({ status: "expired" });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);
    await clearAuthOwnerCookie();

    return NextResponse.json({ status: "confirmed" });
  } catch (error) {
    console.error("Telegram auth status error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
