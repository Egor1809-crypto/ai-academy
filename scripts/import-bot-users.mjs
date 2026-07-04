// FILE: scripts/import-bot-users.mjs
// VERSION: 1.0.0
// START_MODULE_CONTRACT:
// PURPOSE: Разовый перенос текущей аудитории Telegram-бота из bot/data/users.json
//          в таблицу User (единый источник аудитории и маркетингового согласия).
// SCOPE: Идемпотентный upsert по telegramId — marketingConsent, name (для новых),
//        lastSeenAt (из last_interaction), telegramUsername.
// INPUT: bot/data/users.json (если существует). Нет файла → корректный пустой прогон.
// OUTPUT: Печатает сводку (создано/обновлено/пропущено); exit 0 при успехе, 1 при сбое.
// KEYWORDS: DOMAIN(9): AudienceMigration; CONCEPT(8): Idempotency; TECH(8): Prisma
// LINKS: READS_DATA_FROM(9): bot/data/users.json; WRITES_DATA_TO(9): prisma(User)
// END_MODULE_CONTRACT
//
// START_RATIONALE:
// Q: Почему отдельный скрипт, а не миграция трекинга «на лету» внутри бота?
// A: Бот с v2.1.0 читает аудиторию из User, а не из users.json. Уже накопленные в
//    файле пользователи (и, критично, их marketingConsent) не появятся в User сами —
//    трекинг заводит запись только при следующем сообщении, а согласие вообще не
//    восстановится. Разовый импорт ПЕРЕД рестартом бота переносит текущую базу.
// Q: Почему upsert, а не createMany?
// A: Часть пользователей уже могла войти через сайт (есть строка User по telegramId).
//    Затирать их name/tariff/email/marketingConsent из файла нельзя — на update мы лишь
//    добираем недостающее (marketingConsent из файла и lastSeenAt), не перекрывая веб-данные.
// END_RATIONALE
//
// START_INVARIANTS:
// - Идемпотентность: повторный запуск не плодит дубли (ключ upsert — telegramId).
// - Пустой/отсутствующий users.json → 0 изменений, exit 0.
// - marketingConsent из файла применяется как источник истины ТОЛЬКО если в файле true;
//   false в файле не гасит уже выданное в вебе согласие (мягкое слияние — см. RATIONALE ниже).
// END_INVARIANTS
//
// START_RATIONALE:
// Q: Почему false в файле не затирает marketingConsent в БД?
// A: users.json — снимок старого стора; в вебе пользователь мог позже дать согласие.
//    Импорт не должен откатывать более свежее веб-состояние. Отписки после импорта
//    делаются штатно через /stop и /api/account/consent (пишут в ту же строку).
// END_RATIONALE
//
// START_CHANGE_SUMMARY:
// LAST_CHANGE: [v1.0.0 - Первичный импорт аудитории бота из users.json в User]
// END_CHANGE_SUMMARY
//
// START_MODULE_MAP:
// FUNC 10[Оркестрация импорта: чтение файла + upsert по каждому пользователю] => runImport
// END_MODULE_MAP
//
// START_USE_CASES:
// - runImport: Оператор -> ЗапускПередРестартомБота -> АудиторияИСогласиеПеренесеныВUser
// END_USE_CASES

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ и bot/ — соседи под корнем проекта.
const USERS_FILE = resolve(__dirname, "..", "bot", "data", "users.json");

const prisma = new PrismaClient();

function log(op, status, msg) {
  // Формат LDD: [Scope][IMP][fn][block][op] msg [STATUS]
  console.info(`[ImportBotUsers][IMP:8][runImport][${op}] ${msg} [${status}]`);
}

// START_FUNCTION_parseDate
// START_CONTRACT:
// PURPOSE: Безопасный разбор ISO-даты из users.json в Date (или null).
// INPUTS:
//   - строковая дата или undefined => raw
// OUTPUTS: Date | null.
// SIDE_EFFECTS: Нет.
// COMPLEXITY_SCORE: 2
// END_CONTRACT
function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
// END_FUNCTION_parseDate

// START_FUNCTION_runImport
// START_CONTRACT:
// PURPOSE: Читает users.json и идемпотентно переносит каждого пользователя в User.
// INPUTS: Нет (файл берётся по фиксированному пути).
// OUTPUTS: Promise<{created:number, updated:number, skipped:number}>.
// SIDE_EFFECTS: upsert строк User; печать сводки в stdout.
// KEYWORDS: PATTERN(7): BatchUpsert; CONCEPT(9): IdempotentMigration
// COMPLEXITY_SCORE: 6 [Чтение файла + цикл upsert с мягким слиянием согласия]
// END_CONTRACT
async function runImport() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // START_BLOCK_READ_FILE: Чтение снимка аудитории (нет файла → пустой корректный прогон)
  if (!existsSync(USERS_FILE)) {
    log("READ_FILE", "OK", `users.json не найден (${USERS_FILE}) — импортировать нечего.`);
    return { created, updated, skipped };
  }

  let users;
  try {
    const raw = readFileSync(USERS_FILE, "utf-8").trim();
    users = raw ? JSON.parse(raw) : {};
  } catch (e) {
    log("READ_FILE", "FAIL", `не удалось прочитать/распарсить users.json: ${e.message}`);
    throw e;
  }

  const entries = Object.values(users);
  log("READ_FILE", "OK", `записей в users.json: ${entries.length}`);
  // END_BLOCK_READ_FILE

  // START_BLOCK_UPSERT_LOOP: Пер-пользовательский upsert по telegramId
  for (const u of entries) {
    const rawTgId = u.telegram_id ?? u.telegramId;
    if (rawTgId === undefined || rawTgId === null || rawTgId === "") {
      skipped++;
      continue; // без telegramId связать не с чем
    }
    const telegramId = String(rawTgId);
    const name = u.first_name || u.name || "Пользователь";
    const telegramUsername = u.username || u.telegramUsername || null;
    const marketingConsent = u.marketingConsent === true;
    const lastSeenAt = parseDate(u.last_interaction) || parseDate(u.lastSeenAt);

    // Существует ли уже строка (вошёл через сайт / уже импортирован).
    const existing = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, marketingConsent: true, lastSeenAt: true, telegramUsername: true },
    });

    if (existing) {
      // Мягкое слияние: НЕ трогаем name/tariff/email; marketingConsent поднимаем до true
      // только если в файле true (false в файле не откатывает веб-согласие). lastSeenAt —
      // берём максимум, чтобы не «омолодить» активность.
      // BUG_FIX_CONTEXT: раньше telegramUsername клался в data безусловно (если truthy),
      // из-за чего КАЖДЫЙ повторный прогон считался «обновлением» даже без изменений —
      // ложная неидемпотентность в сводке. Теперь включаем поле только если оно реально
      // отличается от уже сохранённого.
      const nextConsent = existing.marketingConsent || marketingConsent;
      const nextLastSeen = maxDate(existing.lastSeenAt, lastSeenAt);
      const data = {};
      if (nextConsent !== existing.marketingConsent) data.marketingConsent = nextConsent;
      if (telegramUsername && telegramUsername !== existing.telegramUsername) {
        data.telegramUsername = telegramUsername;
      }
      if (nextLastSeen && nextLastSeen.getTime() !== (existing.lastSeenAt?.getTime() ?? 0)) {
        data.lastSeenAt = nextLastSeen;
      }
      if (Object.keys(data).length === 0) {
        skipped++;
        continue; // нечего доносить — идемпотентный no-op
      }
      await prisma.user.update({ where: { telegramId }, data });
      updated++;
    } else {
      await prisma.user.create({
        data: {
          telegramId,
          name,
          telegramUsername,
          marketingConsent,
          lastSeenAt,
        },
      });
      created++;
    }
  }
  // END_BLOCK_UPSERT_LOOP

  // START_BLOCK_RETURN: Сводка
  log("RETURN", "OK", `создано: ${created}, обновлено: ${updated}, пропущено: ${skipped}`);
  return { created, updated, skipped };
  // END_BLOCK_RETURN
}
// END_FUNCTION_runImport

// START_FUNCTION_maxDate
// START_CONTRACT:
// PURPOSE: Возвращает более позднюю из двух дат (любая может быть null).
// INPUTS:
//   - a: Date | null
//   - b: Date | null
// OUTPUTS: Date | null.
// SIDE_EFFECTS: Нет.
// COMPLEXITY_SCORE: 2
// END_CONTRACT
function maxDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}
// END_FUNCTION_maxDate

runImport()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(`[ImportBotUsers][IMP:10][runImport][FATAL] ${err?.message ?? err} [FATAL]`);
    await prisma.$disconnect();
    process.exit(1);
  });
