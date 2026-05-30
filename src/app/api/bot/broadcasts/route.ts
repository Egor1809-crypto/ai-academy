import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin";

/**
 * Bot-facing broadcast queue. The bot polls GET to claim the next pending
 * broadcast (atomically flipped to "sending"), delivers it to all its users,
 * then reports the result via POST. Authenticated with the shared secret.
 */

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Claim the oldest pending broadcast in a transaction to avoid double send.
    const claimed = await prisma.$transaction(async (tx) => {
      const next = await tx.broadcast.findFirst({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
      });
      if (!next) return null;
      await tx.broadcast.update({
        where: { id: next.id },
        data: { status: "sending" },
      });
      return next;
    });

    if (!claimed) {
      return NextResponse.json({ broadcast: null });
    }
    return NextResponse.json({ broadcast: { id: claimed.id, message: claimed.message } });
  } catch (error) {
    console.error("Bot broadcast claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const sentCount = Number(body.sentCount ?? 0);
    const failedCount = Number(body.failedCount ?? 0);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await prisma.broadcast.update({
      where: { id },
      data: {
        status: "sent",
        sentCount: Number.isFinite(sentCount) ? sentCount : 0,
        failedCount: Number.isFinite(failedCount) ? failedCount : 0,
        sentAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bot broadcast report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
