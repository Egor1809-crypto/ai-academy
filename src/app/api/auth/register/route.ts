import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, hashPassword } from "@/lib/auth";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";
import { sanitizeInput, isValidEmail, isValidPhone } from "@/lib/security";

// 5 registrations per 10 min per IP
const limiter = createRateLimiter("auth-register", { limit: 5, windowSeconds: 600 });

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const body = await req.json();
    const name = sanitizeInput(String(body.name ?? ""), 100);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const phoneRaw = body.phone ? sanitizeInput(String(body.phone), 20) : null;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Заполните имя, email и пароль" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль должен быть не короче 6 символов" }, { status: 400 });
    }
    if (phoneRaw && !isValidPhone(phoneRaw)) {
      return NextResponse.json({ error: "Введите корректный номер телефона" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Link any existing leads with this email and inherit the latest tariff.
    const matchingLeads = await prisma.lead.findMany({
      where: { email, userId: null },
      orderBy: { createdAt: "desc" },
    });
    const inheritedTariff = matchingLeads[0]?.tariff ?? null;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phoneRaw,
        tariff: inheritedTariff,
      },
    });

    if (matchingLeads.length > 0) {
      await prisma.lead.updateMany({
        where: { email, userId: null },
        data: { userId: user.id },
      });
    }

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
