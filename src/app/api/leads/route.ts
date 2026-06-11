import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";
import {
  safeCompare,
  sanitizeInput,
  isValidPhone,
  isValidEmail,
  bodyTooLarge,
  normalizePhone,
} from "@/lib/security";

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

  if (bodyTooLarge(req, 16 * 1024)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body = await req.json();
    const { name, phone, email, tariff, comment } = body;

    // Honeypot check — if the hidden "website" field is filled, it's a bot
    if (body.website) {
      // Silently accept but don't store — bots think they succeeded
      return NextResponse.json({ success: true });
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

    // Reject malformed emails instead of storing junk (downstream mailings).
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: "Введите корректный email" },
        { status: 400 },
      );
    }

    // Dedup by normalized phone within a 30-day window: if the same person
    // re-submits, refresh their existing lead instead of creating a duplicate.
    // Keeps the spots counter honest and the admin list clean.
    const phoneDigits = normalizePhone(cleanPhone);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = await prisma.lead.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, phone: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const dup = recent.find((l) => normalizePhone(l.phone) === phoneDigits);

    if (dup) {
      const lead = await prisma.lead.update({
        where: { id: dup.id },
        data: {
          name: cleanName,
          email: cleanEmail,
          tariff: cleanTariff,
          ...(cleanComment !== null ? { comment: cleanComment } : {}),
        },
      });
      return NextResponse.json({ success: true, id: lead.id });
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

const ALLOWED_STATUSES = ["new", "contacted", "paid", "rejected"];

export async function PATCH(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = adminLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const password = req.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!password || !adminPassword || !safeCompare(password, adminPassword)) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const status = String(body.status ?? "");
    if (!Number.isInteger(id) || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
    }
    const lead = await prisma.lead.update({ where: { id }, data: { status } });
    return NextResponse.json({ success: true, id: lead.id, status: lead.status });
  } catch (error) {
    console.error("Lead update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
