// FILE: src/app/api/account/erase/route.ts
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Право на удаление ПДн (ст.14 152-ФЗ) — самообслуживаемое удаление
//          аккаунта и связанных заявок текущего пользователя.
// SCOPE: Авторизованный POST; удаляет Lead(userId), User (каскад сессий), чистит cookie.
// INPUT: Cookie сессии.
// OUTPUT: { success }.
// KEYWORDS: DOMAIN(9): SubjectRights; CONCEPT(9): RightToErasure; TECH(7): NextRoute, Prisma
// LINKS: WRITES_DATA_TO(10): prisma(User, Lead, Session); USES_API(8): getCurrentUser
// END_MODULE_CONTRACT
//
// START_RATIONALE:
// Q: Почему удаляем сначала сессию, потом лиды, потом пользователя?
// A: destroyCurrentSession снимает текущую сессию и cookie, пока строка User ещё жива.
//    Затем удаляем собственные заявки пользователя (его ПДн), затем сам User —
//    onDelete:Cascade у Session добьёт остальные сессии, Lead.userId уже нет.
// END_RATIONALE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, destroyCurrentSession } from "@/lib/auth";
import { createRateLimiter, getClientIP } from "@/lib/rate-limit";

const limiter = createRateLimiter("account-erase", { limit: 5, windowSeconds: 300 });

export async function POST(req: NextRequest) {
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
    const userId = user.id;
    // BUG_FIX_CONTEXT: раньше сначала снимали сессию, затем тремя раздельными await
    // удаляли данные — если lead/user.delete падал, пользователь уже разлогинен, а
    // строки User/Lead оставались (частичное невосстановимое состояние, ст.14 не
    // исполнена). Теперь удаление атомарно в транзакции ДО снятия сессии: при сбое
    // пользователь остаётся залогинен, получает 500 и может повторить; данные целостны.
    await prisma.$transaction([
      prisma.lead.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    // Данные удалены (Session каскадно удалилась вместе с User) — снимаем cookie сессии.
    await destroyCurrentSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account erase error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
