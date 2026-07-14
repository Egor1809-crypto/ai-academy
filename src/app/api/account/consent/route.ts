// FILE: src/app/api/account/consent/route.ts
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Отзыв/выдача маркетингового согласия субъектом (ч.2 ст.9 152-ФЗ,
//          ст.18 149-ФЗ) — самообслуживаемый toggle, реально влияющий на рассылку.
// SCOPE: Авторизованный POST { marketingConsent: boolean }.
// INPUT: Cookie сессии + JSON-тело.
// OUTPUT: { success, marketingConsent } — новое состояние.
// KEYWORDS: DOMAIN(9): SubjectRights; CONCEPT(8): ConsentWithdrawal; TECH(7): NextRoute
// LINKS: WRITES_DATA_TO(9): prisma(User, Lead); USES_API(8): getCurrentUser
// END_MODULE_CONTRACT
//
// START_RATIONALE:
// Q: Почему обновляем и User, и связанные Lead?
// A: Аудитория маркетинговых рассылок фильтруется по marketingConsent. Чтобы отзыв
//    реально останавливал обработку (а не оставался «на бумаге»), гасим флаг во всех
//    местах, где он влияет на выборку получателей.
// END_RATIONALE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";
import { isSameOrigin, truncateIp } from "@/lib/security";
import { SITE } from "@/data/content";

const limiter = createRateLimiter("account-consent", { limit: 20, windowSeconds: 60 });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }
  const ip = getClientIP(req);
  const rl = limiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const marketingConsent = body.marketingConsent === true;

    await prisma.user.update({
      where: { id: user.id },
      data: { marketingConsent },
    });
    // Отзыв должен реально останавливать обработку: гасим флаг и на связанных лидах.
    // revokedAt фиксирует ФАКТ отзыва (ст.21 152-ФЗ): при отзыве — метка времени, при
    // повторной выдаче — снимаем. Раньше колонка timestamp'ом не писалась нигде (H2).
    await prisma.lead.updateMany({
      where: { userId: user.id },
      data: { marketingConsent, revokedAt: marketingConsent ? null : new Date() },
    });
    // Append-only реестр согласий (ст.9 152-ФЗ / ст.18 149-ФЗ): каждая выдача/отзыв —
    // отдельная запись с версией документа и усечённым IP → предъявляемый аудит-трейл.
    await prisma.consentRecord
      .create({
        data: {
          userId: user.id,
          type: "marketing",
          granted: marketingConsent,
          version: SITE.legalVersion,
          ip: truncateIp(ip),
        },
      })
      .catch((e) => console.error("ConsentRecord write failed:", e));

    return NextResponse.json({ success: true, marketingConsent });
  } catch (error) {
    console.error("Account consent update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
