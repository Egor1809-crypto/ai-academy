import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const limiter = createRateLimiter("admin-broadcast", { limit: 20, windowSeconds: 60 });

// List recent broadcasts (for the admin UI).
export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }
  if (!isAdminRequest(req)) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const broadcasts = await prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(broadcasts);
  } catch (error) {
    console.error("Broadcast list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Enqueue a broadcast — the bot picks it up and delivers it.
export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }
  if (!isAdminRequest(req)) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const message = String(body.message ?? "").trim().slice(0, 4000);
    if (!message) {
      return NextResponse.json({ error: "Сообщение не может быть пустым" }, { status: 400 });
    }
    const broadcast = await prisma.broadcast.create({ data: { message } });
    return NextResponse.json({ success: true, id: broadcast.id });
  } catch (error) {
    console.error("Broadcast enqueue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
