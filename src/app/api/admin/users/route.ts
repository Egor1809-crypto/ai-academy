import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const limiter = createRateLimiter("admin-users", { limit: 30, windowSeconds: 60 });

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  if (!(await requireAdmin())) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        telegramUsername: true,
        telegramId: true,
        tariff: true,
        role: true,
        createdAt: true,
        _count: { select: { leads: true } },
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
