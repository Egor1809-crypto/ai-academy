// FILE: scripts/retention.mjs
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Регламент ретеншна ПДн — физически исполняет сроки хранения, обещанные
//          в Политике конфиденциальности и Согласии (ст.5 п.7, ст.21 152-ФЗ).
// SCOPE: Очистка истёкших сессий и одноразовых кодов, удаление просроченных лидов,
//        обезличивание старых IP согласия, TTL журнала входов.
// INPUT: Нет (работает с БД по DATABASE_URL из окружения).
// OUTPUT: Печатает сводку удалённых/обезличенных записей; exit 0 при успехе, 1 при сбое.
// KEYWORDS: DOMAIN(9): DataRetention; CONCEPT(8): GDPR/152FZ; TECH(7): Prisma, Cron
// LINKS: READS_DATA_FROM(9): prisma; WRITES_DATA_TO(9): sessions/auth_codes/leads/login_events
// END_MODULE_CONTRACT
//
// START_RATIONALE:
// Q: Почему отдельный cron-скрипт, а не чистка «по требованию» в рантайме?
// A: Сроки хранения — сквозная обязанность оператора, не привязанная к запросу
//    пользователя. Истёкшие сессии сейчас удаляются лишь лениво (при повторном
//    предъявлении токена), auth-коды и старые лиды не чистились вовсе. Плановая
//    джоба даёт детерминированный, аудируемый проход. Запускать из crontab прод-
//    сервера раз в сутки: `cd /var/www/ai-academy && node scripts/retention.mjs`.
// END_RATIONALE
//
// START_INVARIANTS:
// - Скрипт идемпотентен: повторный запуск на «чистой» БД удаляет 0 записей.
// - Ошибка на одном шаге не отменяет уже выполненные (каждый шаг автономен).
// - Обезличивание IP необратимо: consent_ip → NULL по истечении окна.
// END_INVARIANTS
//
// START_CHANGE_SUMMARY:
// LAST_CHANGE: [v1.0.0 - Первичная реализация ретеншн-джобы под 152-ФЗ]
// END_CHANGE_SUMMARY
//
// START_MODULE_MAP:
// FUNC 10[Оркестрация всех шагов ретеншна] => runRetention
// END_MODULE_MAP
//
// START_USE_CASES:
// - runRetention: Cron -> ПрогонРетеншна -> ПДнУдаленыИлиОбезличеныПоСрокам
// END_USE_CASES

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Сроки хранения (дни). Держать синхронно с Политикой (privacy разд. «Сроки»). ──
const CONSENT_IP_RETENTION_DAYS = 365; // после года IP согласия обезличивается
const LOGIN_EVENT_RETENTION_DAYS = 365; // журнал входов хранится 12 мес.

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function log(op, status, msg) {
  // Формат LDD: [Scope][IMP][fn][block][op] msg [STATUS]
  console.info(`[Retention][IMP:8][runRetention][${op}] ${msg} [${status}]`);
}

// START_FUNCTION_runRetention
// START_CONTRACT:
// PURPOSE: Последовательно исполняет все шаги ретеншна и печатает сводку.
// INPUTS: Нет.
// OUTPUTS: number - суммарное число затронутых записей.
// SIDE_EFFECTS: Удаляет/обновляет строки в БД; пишет в stdout.
// KEYWORDS: PATTERN(7): BatchJob; CONCEPT(9): RetentionEnforcement
// COMPLEXITY_SCORE: 5 [Линейная последовательность независимых deleteMany/updateMany]
// END_CONTRACT
async function runRetention() {
  const now = new Date();
  let affected = 0;

  // START_BLOCK_SESSIONS: Истёкшие сессии (ленивая чистка недостаточна)
  const sessions = await prisma.session.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  affected += sessions.count;
  log("SESSIONS", "OK", `истёкших сессий удалено: ${sessions.count}`);
  // END_BLOCK_SESSIONS

  // START_BLOCK_AUTHCODES: Истёкшие ИЛИ уже использованные одноразовые коды (ПДн Telegram)
  const authCodes = await prisma.authCode.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }],
    },
  });
  affected += authCodes.count;
  log("AUTHCODES", "OK", `одноразовых кодов удалено: ${authCodes.count}`);
  // END_BLOCK_AUTHCODES

  // START_BLOCK_LEADS_PURGE: Лиды с истёкшим сроком хранения (purge_after)
  const leadsPurged = await prisma.lead.deleteMany({
    where: { purgeAfter: { not: null, lte: now } },
  });
  affected += leadsPurged.count;
  log("LEADS_PURGE", "OK", `просроченных лидов удалено: ${leadsPurged.count}`);
  // END_BLOCK_LEADS_PURGE

  // START_BLOCK_CONSENT_IP: Обезличивание IP согласия после окна хранения
  const ipCutoff = daysAgo(CONSENT_IP_RETENTION_DAYS);
  const ipAnon = await prisma.lead.updateMany({
    where: { consentIp: { not: null }, consentAt: { lt: ipCutoff } },
    data: { consentIp: null },
  });
  affected += ipAnon.count;
  log("CONSENT_IP", "OK", `IP согласия обезличено (older than ${CONSENT_IP_RETENTION_DAYS}d): ${ipAnon.count}`);
  // END_BLOCK_CONSENT_IP

  // START_BLOCK_LOGIN_EVENTS: TTL журнала входов
  const loginCutoff = daysAgo(LOGIN_EVENT_RETENTION_DAYS);
  const loginEvents = await prisma.loginEvent.deleteMany({
    where: { createdAt: { lt: loginCutoff } },
  });
  affected += loginEvents.count;
  log("LOGIN_EVENTS", "OK", `событий входа удалено (older than ${LOGIN_EVENT_RETENTION_DAYS}d): ${loginEvents.count}`);
  // END_BLOCK_LOGIN_EVENTS

  // START_BLOCK_RETURN: Сводка
  console.info(
    `[Retention][IMP:9][runRetention][RETURN] прогон завершён; всего затронуто записей: ${affected} [VALUE]`,
  );
  return affected;
  // END_BLOCK_RETURN
}
// END_FUNCTION_runRetention

runRetention()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(`[Retention][IMP:10][runRetention][FATAL] ${err?.message ?? err} [FATAL]`);
    await prisma.$disconnect();
    process.exit(1);
  });
