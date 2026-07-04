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
  truncateIp,
} from "@/lib/security";
import { getCurrentUser } from "@/lib/auth";
import { SITE } from "@/data/content";

// Срок хранения лида по умолчанию (ст.5 п.7 152-ФЗ — ограничение срока хранения).
// Отсчитывается от момента согласия; по истечении лид удаляется ретеншн-джобой.
const LEAD_RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000; // ~3 года

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

    // 152-ФЗ: без явного согласия на обработку ПДн данные принимать нельзя.
    const consent = body.consent === true;
    const marketingConsent = body.marketingConsent === true;
    if (!consent) {
      return NextResponse.json(
        { error: "Требуется согласие на обработку персональных данных" },
        { status: 400 },
      );
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
    // Единая нормализация e-mail (trim делает sanitizeInput) + lower-case, как в
    // /api/auth/login: иначе один адрес в лиде и у пользователя разошёлся бы по
    // регистру и будущая связка lead↔user промахнулась бы (C4).
    const cleanEmail = email ? sanitizeInput(String(email), 200).toLowerCase() : null;
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
    // BUG_FIX_CONTEXT: раньше грузили «последние 200» лидов за 30 дней и
    // фильтровали в JS — при >200 заявок дубли за окном не ловились, а счётчик
    // мест занижался. Теперь запрос по индексированному phone_normalized (C3).
    const phoneDigits = normalizePhone(cleanPhone);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dup = await prisma.lead.findFirst({
      where: { phoneNormalized: phoneDigits, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    // Общие поля согласия/ретеншна — один источник истины для create и update.
    const now = new Date();
    const consentFields = {
      phoneNormalized: phoneDigits,
      consent: true,
      marketingConsent,
      consentAt: now,
      consentIp: truncateIp(ip),
      policyVersion: SITE.legalVersion,
      purgeAfter: new Date(now.getTime() + LEAD_RETENTION_MS),
    };

    if (dup) {
      const lead = await prisma.lead.update({
        where: { id: dup.id },
        data: {
          name: cleanName,
          email: cleanEmail,
          tariff: cleanTariff,
          ...(cleanComment !== null ? { comment: cleanComment } : {}),
          // Повторная заявка = свежее согласие: снимаем прежний отзыв, если был.
          revokedAt: null,
          ...consentFields,
        },
      });
      return NextResponse.json({ success: true, id: lead.id });
    }

    // Если заявку оставляет уже залогиненный пользователь — сразу связываем лид с
    // его аккаунтом (populates Lead.userId для кабинета/выгрузки/удаления/отзыва).
    // Только на create: на dedup-update не переприсваиваем чужой лид другому userId.
    const currentUser = await getCurrentUser();

    const lead = await prisma.lead.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        tariff: cleanTariff,
        ...(cleanComment !== null ? { comment: cleanComment } : {}),
        ...(currentUser ? { userId: currentUser.id } : {}),
        ...consentFields,
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
