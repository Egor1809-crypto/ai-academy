// FILE: src/app/api/account/export/route.ts
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Право субъекта на доступ к своим ПДн (ст.14 152-ФЗ) — самообслуживаемая
//          выгрузка всех данных текущего пользователя одним JSON-файлом.
// SCOPE: Авторизованный GET; профиль + заявки + журнал входов по userId.
// INPUT: Cookie сессии.
// OUTPUT: application/json attachment без секретов (passwordHash не выгружается).
// KEYWORDS: DOMAIN(9): SubjectRights; CONCEPT(8): DataPortability; TECH(7): NextRoute, Prisma
// LINKS: READS_DATA_FROM(9): prisma; USES_API(8): getCurrentUser
// END_MODULE_CONTRACT

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const limiter = createRateLimiter("account-export", { limit: 10, windowSeconds: 60 });

export async function GET(req: NextRequest) {
  const rl = limiter.check(getClientIP(req));
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
    // Явный select без passwordHash — секрет не выгружаем даже владельцу.
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        telegramId: true,
        telegramUsername: true,
        tariff: true,
        role: true,
        consentAt: true,
        consentVersion: true,
        marketingConsent: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const leads = await prisma.lead.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const loginEvents = await prisma.loginEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      note:
        "Выгрузка персональных данных по вашему запросу (ст.14 152-ФЗ). " +
        "Секреты (хеш пароля) не включаются. Содержимое переписки с AI-ассистентом " +
        "не хранится на сервере и здесь не приводится.",
      account,
      leads,
      loginEvents,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="ai-legal-my-data-${user.id}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Account export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
