import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput, bodyTooLarge } from "@/lib/security";
import { isBotRequest } from "@/lib/admin";

/**
 * Called server-to-server BY THE BOT after a user presses Start with an
 * `auth_<code>` payload. Authenticated with the shared ADMIN_PASSWORD secret
 * (the bot already holds it). Marks the code confirmed and upserts the user by
 * Telegram id. The browser that created the code picks up the session via the
 * polling `status` endpoint — the session is never created here.
 */
export async function POST(req: NextRequest) {
  if (!isBotRequest(req)) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (bodyTooLarge(req, 8 * 1024)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
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

    // Upsert user by Telegram id. Тариф здесь НЕ проставляется автоматически.
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
      // BUG_FIX_CONTEXT: раньше новому TG-пользователю присваивался тариф из
      // «последнего telegram-лида глобально» (findFirst source~telegram orderBy
      // createdAt desc) — без сопоставления по личности. Любой новый пользователь
      // наследовал тариф случайного человека — тот же класс кросс-присвоения, что
      // уже давал утечку чужих заявок (C2). Тариф выдаёт куратор вручную после
      // сверки оплаты; автоматическая привязка требует verified-контакта (follow-up).
      await prisma.user.create({
        data: {
          name: firstName || "Пользователь",
          telegramId,
          telegramUsername,
          tariff: null,
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
