import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

// 10 login attempts per 5 min per IP
const limiter = createRateLimiter("auth-login", { limit: 10, windowSeconds: 300 });

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Введите email и пароль" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always run a hash comparison to avoid leaking whether the email exists.
    const ok =
      user?.passwordHash != null && (await verifyPassword(password, user.passwordHash));

    if (!user || !ok) {
      // Журналирование попыток входа (логи PM2 → logrotate). BUG_FIX_CONTEXT:
      // раньше писали email открытым текстом — это накопление ПДн третьих лиц в
      // логах (минимизация по ст.5 152-ФЗ). Логируем псевдонимный хеш: brute-force
      // и корреляция попыток сохраняются, plaintext-ПДн — нет.
      const emailHash = createHash("sha256").update(email).digest("hex").slice(0, 12);
      console.warn(
        `[auth][login][FAIL] ${JSON.stringify({ ts: new Date().toISOString(), ip, emailHash })}`,
      );
      // Constant-ish delay to slow brute force
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    console.info(
      `[auth][login][OK] ${JSON.stringify({ ts: new Date().toISOString(), ip, userId: user.id })}`,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
