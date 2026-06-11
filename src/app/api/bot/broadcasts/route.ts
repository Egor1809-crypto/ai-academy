import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBotRequest } from "@/lib/admin";
import { bodyTooLarge } from "@/lib/security";

/**
 * Bot-facing broadcast queue. The bot polls GET to claim the next pending
 * broadcast (atomically flipped to "sending"), delivers it to all its users,
 * then reports the result via POST. Authenticated with the shared secret.
 */

export async function GET(req: NextRequest) {
  if (!isBotRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the oldest pending broadcast, then ATOMICALLY claim it via a
    // conditional updateMany: only the request whose update actually flips a
    // still-"pending" row (count === 1) wins. Concurrent pollers / retries that
    // lose the race get count === 0 and back off — prevents double-send.
    const next = await prisma.broadcast.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    if (!next) {
      return NextResponse.json({ broadcast: null });
    }
    const claim = await prisma.broadcast.updateMany({
      where: { id: next.id, status: "pending" },
      data: { status: "sending" },
    });
    if (claim.count !== 1) {
      // Another poller claimed it first — nothing to do this round.
      return NextResponse.json({ broadcast: null });
    }
    return NextResponse.json({ broadcast: { id: next.id, message: next.message } });
  } catch (error) {
    console.error("Bot broadcast claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isBotRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (bodyTooLarge(req, 8 * 1024)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const sentCount = Number(body.sentCount ?? 0);
    const failedCount = Number(body.failedCount ?? 0);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    // Only finalize a broadcast that is actually in-flight ("sending") — guards
    // against a stray report flipping an arbitrary row to "sent".
    const res = await prisma.broadcast.updateMany({
      where: { id, status: "sending" },
      data: {
        status: "sent",
        sentCount: Number.isFinite(sentCount) ? sentCount : 0,
        failedCount: Number.isFinite(failedCount) ? failedCount : 0,
        sentAt: new Date(),
      },
    });
    if (res.count !== 1) {
      return NextResponse.json({ error: "Broadcast not in sending state" }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bot broadcast report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
