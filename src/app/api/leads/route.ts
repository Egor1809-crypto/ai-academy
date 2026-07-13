import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";
import {
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
// Global backstop across ALL IPs (mirrors chat/tts): the per-IP cap alone is
// defeated by IP/IPv6 rotation, which would flood the lead table, the public
// "spots left" counter (/api/spots) and hub-forwarding. Generous for real signups.
const submitGlobalLimiter = createRateLimiter("leads-submit-global", { limit: 60, windowSeconds: 60 });

// Пересылка лида в единый хаб заявок (tech-pravo.ru). Fire-and-forget: сбой хаба
// никогда не должен ронять приём заявки на этом сайте.
function forwardToHub(lead: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  comment?: string | null;
  tariff?: string | null;
}): void {
  const url = process.env.LEADS_HUB_URL || "https://tech-pravo.ru/api/leads/ingest";
  const key = process.env.LEADS_HUB_KEY;
  if (!key) return;
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Site-Id": "expertum.pro",
      "X-Api-Key": key,
    },
    body: JSON.stringify({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      message: lead.comment,
      request_type: lead.tariff ? `tariff:${lead.tariff}` : "lead",
      consent: true,
      payload: { tariff: lead.tariff, site: "expertum.pro" },
    }),
  }).catch((e) => console.error("forwardToHub failed:", e?.message || e));
}

export async function POST(req: NextRequest) {
  // Rate limit — per-IP first, then a global backstop against IP-rotation floods.
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
  const rlGlobal = submitGlobalLimiter.check("global");
  if (!rlGlobal.allowed) {
    return NextResponse.json(
      { error: "Сервис временно перегружен. Попробуйте чуть позже." },
      { status: 429, headers: { "Retry-After": String(rlGlobal.retryAfterSeconds) } },
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
      forwardToHub({ name: cleanName, phone: cleanPhone, email: cleanEmail, comment: cleanComment, tariff: cleanTariff });
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

    forwardToHub({ name: cleanName, phone: cleanPhone, email: cleanEmail, comment: cleanComment, tariff: cleanTariff });
    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    console.error("Lead creation error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

// Admin lead read (GET) and status update (PATCH) were removed: lead management
// moved to the partner admin panel at tech-pravo.ru (leads are pushed there via
// forwardToHub). Only the public POST (lead submission) remains on this site.
