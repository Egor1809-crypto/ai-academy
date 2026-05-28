import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";
import { safeCompare, sanitizeInput, isValidPhone } from "@/lib/security";

// 5 submissions per 10 minutes per IP — very strict, prevents spam
const submitLimiter = createRateLimiter("leads-submit", { limit: 5, windowSeconds: 600 });
// Admin reads: 30 per minute
const adminLimiter = createRateLimiter("leads-admin", { limit: 30, windowSeconds: 60 });

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIP(req);
  const rl = submitLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Слишком много заявок. Попробуйте позже." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  try {
    const body = await req.json();
    const { name, phone, email, tariff, comment } = body;

    // Honeypot check — if the hidden "website" field is filled, it's a bot
    if (body.website) {
      // Silently accept but don't store — bots think they succeeded
      return NextResponse.json({ success: true, id: "ok" });
    }

    if (!name || !phone || !tariff) {
      return NextResponse.json(
        { error: "Заполните обязательные поля" },
        { status: 400 },
      );
    }

    // Validate phone
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Введите корректный номер телефона" },
        { status: 400 },
      );
    }

    // Sanitize all inputs
    const cleanName = sanitizeInput(String(name), 100);
    const cleanPhone = sanitizeInput(String(phone), 20);
    const cleanEmail = email ? sanitizeInput(String(email), 200) : null;
    const cleanTariff = sanitizeInput(String(tariff), 50);
    const cleanComment = comment ? sanitizeInput(String(comment), 1000) : null;

    if (!cleanName || !cleanPhone || !cleanTariff) {
      return NextResponse.json(
        { error: "Некорректные данные" },
        { status: 400 },
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        tariff: cleanTariff,
        ...(cleanComment !== null ? { comment: cleanComment } : {}),
      },
    });

    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    console.error("Lead creation error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  // Rate limit admin endpoint
  const ip = getClientIP(req);
  const rl = adminLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  const password = req.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!password || !adminPassword || !safeCompare(password, adminPassword)) {
    // Artificial delay to further mitigate brute force
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Leads fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
