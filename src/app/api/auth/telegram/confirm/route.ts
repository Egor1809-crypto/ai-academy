import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare, sanitizeInput } from "@/lib/security";

/**
 * Called server-to-server BY THE BOT after a user presses Start with an
 * `auth_<code>` payload. Authenticated with the shared ADMIN_PASSWORD secret
 * (the bot already holds it). Marks the code confirmed and upserts the user by
 * Telegram id. The browser that created the code picks up the session via the
 * polling `status` endpoint — the session is never created here.
 */
export async function POST(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!password || !adminPassword || !safeCompare(password, adminPassword)) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const code = String(body.code ?? "");
    const telegramId = String(body.telegramId ?? "").slice(0, 32);
    const telegramUsername = body.telegramUsername
      ? sanitizeInput(String(body.telegramUsername), 64)
      : null;
    const firstName = body.firstName ? sanitizeInput(String(body.firstName), 100) : null;

    if (!code || !telegramId) {
      return NextResponse.json({ error: "code and telegramId required" }, { status: 400 });
    }

    const authCode = await prisma.authCode.findUnique({ where: { code } });
    if (!authCode) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }
    if (authCode.expiresAt < new Date()) {
      return NextResponse.json({ error: "Code expired" }, { status: 410 });
    }

    // Upsert user by Telegram id. Inherit latest tariff from matching leads.
    const existing = await prisma.user.findUnique({ where: { telegramId } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          telegramUsername: telegramUsername ?? existing.telegramUsername,
          name: existing.name || firstName || "Пользователь",
        },
      });
    } else {
      const matchingLead = await prisma.lead.findFirst({
        where: { source: { contains: "telegram" } },
        orderBy: { createdAt: "desc" },
      });
      await prisma.user.create({
        data: {
          name: firstName || "Пользователь",
          telegramId,
          telegramUsername,
          tariff: matchingLead?.tariff ?? null,
        },
      });
    }

    await prisma.authCode.update({
      where: { code },
      data: { telegramId, telegramUsername, firstName, confirmedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram auth confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
