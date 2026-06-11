import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { COURSE } from "@/data/content";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const TOTAL_SPOTS = COURSE.totalSpots;

// 30 per minute — it's a public read endpoint, but still limit
const limiter = createRateLimiter("spots", { limit: 30, windowSeconds: 60 });

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { spotsLeft: TOTAL_SPOTS, total: TOTAL_SPOTS },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSeconds),
          "Cache-Control": "public, max-age=30",
        },
      },
    );
  }

  try {
    // Count only leads that actually occupy a spot — exclude rejected ones so
    // refusals/spam don't artificially close the course on the landing page.
    const leadsCount = await prisma.lead.count({
      where: { status: { not: "rejected" } },
    });
    const spotsLeft = Math.max(0, TOTAL_SPOTS - leadsCount);

    return NextResponse.json(
      { spotsLeft, total: TOTAL_SPOTS },
      {
        headers: { "Cache-Control": "public, max-age=30" },
      },
    );
  } catch {
    return NextResponse.json(
      { spotsLeft: TOTAL_SPOTS, total: TOTAL_SPOTS },
      {
        headers: { "Cache-Control": "public, max-age=30" },
      },
    );
  }
}
