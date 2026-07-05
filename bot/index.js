// FILE: bot/index.js
// VERSION: 2.1.0
// AI Legal Academy Telegram Bot — Enterprise Edition
// CHANGE (v2.1.0): аудитория бота перенесена с bot/data/users.json на БД (таблица User,
//   ключ telegramId). Маркетинговое согласие живёт в ОДНОМ месте — /stop в боте и веб-отзыв
//   (/api/account/consent) пишут одну строку User.marketingConsent. Рассылки логируются
//   пер-получательно в BroadcastRecipient (C7, ст.18 149-ФЗ). users.json больше не стор.

import { Bot, Keyboard, InlineKeyboard, session } from "grammy";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// ENV & CONFIG
// ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

// Fail fast with a clear message if the env file is missing/unreadable, instead
// of crash-looping under PM2 with an opaque ENOENT.
let envFile;
try {
  envFile = readFileSync(resolve(__dirname, ".env"), "utf-8");
} catch (e) {
  console.error(`[FATAL] Не удалось прочитать bot/.env: ${e.message}`);
  console.error("Создайте bot/.env с BOT_TOKEN, SITE_URL, API_URL, ADMIN_CHAT_ID и т.д.");
  process.exit(1);
}
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const BOT_TOKEN = env.BOT_TOKEN;
const SITE_URL = env.SITE_URL;
const API_URL = env.API_URL || "http://localhost:3099";
const ADMIN_CHAT_ID = env.ADMIN_CHAT_ID || "";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "";
// Dedicated server-to-server secret for bot→site calls. Falls back to
// ADMIN_PASSWORD for a zero-downtime transition until BOT_SHARED_SECRET is set
// in both envs (site reads it via isBotRequest()).
const BOT_SHARED_SECRET = env.BOT_SHARED_SECRET || ADMIN_PASSWORD;
const NAVI_API_KEY = env.NAVI_API_KEY || "";
const NAVI_BASE_URL = "https://api.navy/v1";
const AI_MODEL = "deepseek-chat";
const MAX_AI_INPUT = 1000; // cap user text forwarded to the paid LLM
// Аудитория бота теперь живёт в БД (таблица User), а не в bot/data/users.json.
// Бот парсит bot/.env в локальный объект env (НЕ в process.env), поэтому Prisma
// инстанцируется с явным datasources.db.url = env.DATABASE_URL (см. блок PRISMA ниже).
const DATABASE_URL = env.DATABASE_URL || "";

// Fail fast on missing critical config rather than running with broken buttons.
const __missing = [];
if (!BOT_TOKEN) __missing.push("BOT_TOKEN");
if (!SITE_URL) __missing.push("SITE_URL");
if (__missing.length) {
  console.error(`[FATAL] Отсутствуют обязательные переменные в bot/.env: ${__missing.join(", ")}`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 152-ФЗ: текст-уведомление о согласии, добавляется в начало флоу сбора заявки.
// Продолжение флоу (ввод имени) — affirmative action подтверждения согласия.
const CONSENT_NOTICE =
  `<i>Продолжая, вы подтверждаете, что вам есть 18 лет, и даёте согласие на обработку ` +
  `персональных данных. Политика: ${SITE_URL}/legal/privacy</i>`;

// B4 (152-ФЗ, ст.12) / D2: предупреждение о трансграничной передаче ПДн в сторонний
// AI-сервис. Показывается перед входом в AI-чат бота — паритет с сайтом (ManyashaChat,
// LiveDemo). ТОЧНЫЙ текст согласован с ТЗ (раздел B4); не менять формулировку.
const AI_NOTICE =
  `⚠️ Сообщения в AI-чате обрабатываются сторонним AI-сервисом, возможна ` +
  `трансграничная передача данных. Не вводите персональные данные доверителей, ` +
  `охраняемую законом тайну и конфиденциальную информацию.`;

// Per-user sliding-window rate limit for PAID LLM calls — protects the API
// budget from a single user/bot spamming the free-form chat fallback.
const __aiCalls = new Map(); // userId -> number[] (timestamps)
function aiRateLimitOk(userId, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const arr = (__aiCalls.get(userId) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    __aiCalls.set(userId, arr);
    return false;
  }
  arr.push(now);
  __aiCalls.set(userId, arr);
  // Opportunistic cleanup to bound memory.
  if (__aiCalls.size > 5000) {
    for (const [k, v] of __aiCalls) {
      if (!v.some((t) => now - t < windowMs)) __aiCalls.delete(k);
    }
  }
  return true;
}

/**
 * Escape user-controlled text before embedding it in a Telegram
 * parse_mode:"HTML" message. Without this, a user's name/message containing
 * <, >, & can break formatting or inject clickable links into the admin chat.
 */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─────────────────────────────────────────────────────────────
// PRISMA — единый источник аудитории бота (таблица User)
// ─────────────────────────────────────────────────────────────
//
// START_RATIONALE:
// Q: Почему new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } }),
//    а не дефолтный конструктор как в src/lib/prisma.ts?
// A: Бот парсит bot/.env в локальный объект env, НЕ в process.env. Prisma по умолчанию
//    читает DATABASE_URL из process.env(...) (см. schema datasource url = env("DATABASE_URL")),
//    которого здесь нет. Явно прокидываем url из env, иначе клиент упадёт «Environment
//    variable not found: DATABASE_URL» уже на первом запросе.
// Q: Почему единый источник, а не users.json?
// A: Маркетинговое согласие обязано жить в ОДНОМ месте: веб-отзыв (User.marketingConsent
//    через /api/account/consent) и /stop в боте должны писать одну и ту же строку, иначе
//    отписка на сайте не исключала бы пользователя из рассылки бота (нарушение ст.18 149-ФЗ).
// END_RATIONALE

// BUG_FIX_CONTEXT: отсутствие DATABASE_URL раньше уронило бы бота опаковым «Environment
// variable not found» на первом же запросе к БД. Проверяем заранее и даём внятную ошибку
// (на проде — добавить DATABASE_URL в bot/.env), не давая PM2 крутить crash-loop без причины.
if (!DATABASE_URL) {
  console.error("[FATAL] Отсутствует DATABASE_URL в bot/.env — аудитория бота хранится в БД (таблица User).");
  console.error("Добавьте DATABASE_URL=postgresql://... в bot/.env (та же БД, что и у сайта).");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

// ─────────────────────────────────────────────────────────────
// USER TRACKING (persisted in User table, keyed by telegramId)
// ─────────────────────────────────────────────────────────────

// START_FUNCTION_startOfToday
// START_CONTRACT:
// PURPOSE: Полночь текущих суток (локальное время сервера) — граница для getActiveToday.
// INPUTS: Нет.
// OUTPUTS: Date - начало сегодняшнего дня (00:00:00.000).
// SIDE_EFFECTS: Нет.
// COMPLEXITY_SCORE: 1 [Тривиальный расчёт границы суток]
// END_CONTRACT
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
// END_FUNCTION_startOfToday

// START_FUNCTION_trackUser
// START_CONTRACT:
// PURPOSE: Регистрирует/обновляет пользователя бота в таблице User по telegramId.
// INPUTS:
//   - grammy-контекст обновления => ctx
// OUTPUTS: Promise<void>.
// SIDE_EFFECTS: upsert строки User; при сбое — только лог (обработка сообщения не падает).
// KEYWORDS: PATTERN(7): Upsert; CONCEPT(8): AudienceTracking; TECH(8): Prisma
// COMPLEXITY_SCORE: 4 [Upsert с раздельной семантикой create/update]
// END_CONTRACT
async function trackUser(ctx) {
  const from = ctx.from;
  if (!from) return;

  // START_BLOCK_UPSERT: Мягкий upsert — create заводит нового, update лишь освежает активность
  try {
    const telegramId = String(from.id);
    const now = new Date();
    const username = from.username || null;
    // BUG_FIX_CONTEXT: на update НЕЛЬЗЯ перезаписывать name/tariff/email/marketingConsent/
    // passwordHash существующего юзера — иначе трекинг бота затирал бы данные, выставленные
    // в веб-кабинете (напр. отписку через /api/account/consent или тариф куратора). Обновляем
    // только lastSeenAt и telegramUsername (если он пришёл). marketingConsent НЕ трогаем.
    const updateData = { lastSeenAt: now };
    if (username) updateData.telegramUsername = username;

    await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        name: from.first_name || "Пользователь",
        telegramUsername: username,
        lastSeenAt: now,
      },
      update: updateData,
    });
  } catch (e) {
    // Сбой трекинга НЕ должен ронять обработку сообщения — только фиксируем в лог.
    console.error("[UserStore][IMP:8][trackUser][UPSERT] сбой трекинга пользователя [FAIL]", e.message);
  }
  // END_BLOCK_UPSERT
}
// END_FUNCTION_trackUser

// START_FUNCTION_getUserCount
// START_CONTRACT:
// PURPOSE: Число известных боту пользователей (у кого заполнен telegramId).
// INPUTS: Нет.
// OUTPUTS: Promise<number>.
// SIDE_EFFECTS: SELECT count. При сбое → 0 (для админ-панели, не критично).
// COMPLEXITY_SCORE: 2
// END_CONTRACT
async function getUserCount() {
  try {
    return await prisma.user.count({ where: { telegramId: { not: null } } });
  } catch (e) {
    console.error("[UserStore][IMP:8][getUserCount] сбой подсчёта [FAIL]", e.message);
    return 0;
  }
}
// END_FUNCTION_getUserCount

// START_FUNCTION_getActiveToday
// START_CONTRACT:
// PURPOSE: Число пользователей, активных в боте с начала текущих суток.
// INPUTS: Нет.
// OUTPUTS: Promise<number>.
// SIDE_EFFECTS: SELECT count по lastSeenAt >= startOfToday(). При сбое → 0.
// COMPLEXITY_SCORE: 2
// END_CONTRACT
async function getActiveToday() {
  try {
    return await prisma.user.count({
      where: { telegramId: { not: null }, lastSeenAt: { gte: startOfToday() } },
    });
  } catch (e) {
    console.error("[UserStore][IMP:8][getActiveToday] сбой подсчёта [FAIL]", e.message);
    return 0;
  }
}
// END_FUNCTION_getActiveToday

// START_FUNCTION_getAllChatIds
// START_CONTRACT:
// PURPOSE: Все telegramId известной боту аудитории (для метрики «всего»).
// INPUTS: Нет.
// OUTPUTS: Promise<string[]> - массив telegramId.
// SIDE_EFFECTS: SELECT. При сбое → [].
// COMPLEXITY_SCORE: 2
// END_CONTRACT
async function getAllChatIds() {
  try {
    const rows = await prisma.user.findMany({
      where: { telegramId: { not: null } },
      select: { telegramId: true },
    });
    return rows.map((r) => r.telegramId);
  } catch (e) {
    console.error("[UserStore][IMP:8][getAllChatIds] сбой выборки [FAIL]", e.message);
    return [];
  }
}
// END_FUNCTION_getAllChatIds

// START_FUNCTION_getMarketingChatIds
// START_CONTRACT:
// PURPOSE: Аудитория рекламной рассылки — только давшие маркетинговое согласие.
// INPUTS: Нет.
// OUTPUTS: Promise<Array<{id:number, telegramId:string}>>.
// SIDE_EFFECTS: SELECT. При сбое → [] (рассылка не уходит — безопасный дефолт).
// KEYWORDS: CONCEPT(9): ConsentedAudience; TECH(8): Prisma
// COMPLEXITY_SCORE: 3
// END_CONTRACT
// D1 (ст.18 149-ФЗ): реклама по сетям связи допустима только по предварительному
// согласию адресата. Аудитория рассылки — строго пользователи с marketingConsent===true.
// Отсутствие согласия трактуется как отсутствие согласия (не рассылаем). Веб-отзыв через
// /api/account/consent гасит User.marketingConsent → пользователь автоматически выпадает.
// Возвращаем {id, telegramId}: id нужен для лога BroadcastRecipient.userId.
async function getMarketingChatIds() {
  try {
    return await prisma.user.findMany({
      where: { telegramId: { not: null }, marketingConsent: true },
      select: { id: true, telegramId: true },
    });
  } catch (e) {
    console.error("[UserStore][IMP:8][getMarketingChatIds] сбой выборки [FAIL]", e.message);
    return [];
  }
}
// END_FUNCTION_getMarketingChatIds

// START_FUNCTION_setMarketingConsent
// START_CONTRACT:
// PURPOSE: Переключение маркетингового согласия (команды /reklama, /stop) в User.
// INPUTS:
//   - grammy-контекст => ctx
//   - целевое значение согласия => value: boolean
// OUTPUTS: Promise<boolean> - true при успешной записи.
// SIDE_EFFECTS: upsert строки User по telegramId (create при отсутствии).
// KEYWORDS: CONCEPT(9): ConsentWithdrawal; TECH(8): Prisma
// COMPLEXITY_SCORE: 3
// END_CONTRACT
// D1: /stop (отписка) обязателен по ст.18 149-ФЗ. Пишем в ту же строку User, что и
// веб-отзыв — единый источник согласия.
async function setMarketingConsent(ctx, value) {
  const from = ctx.from;
  if (!from) return false;
  try {
    const telegramId = String(from.id);
    const consent = value === true;
    await prisma.user.upsert({
      where: { telegramId },
      create: {
        telegramId,
        name: from.first_name || "Пользователь",
        telegramUsername: from.username || null,
        marketingConsent: consent,
        lastSeenAt: new Date(),
      },
      update: { marketingConsent: consent },
    });
    return true;
  } catch (e) {
    console.error("[UserStore][IMP:9][setMarketingConsent] сбой записи согласия [FAIL]", e.message);
    return false;
  }
}
// END_FUNCTION_setMarketingConsent

// ─────────────────────────────────────────────────────────────
// BOT INIT
// ─────────────────────────────────────────────────────────────

const bot = new Bot(BOT_TOKEN);

bot.use(
  session({
    // aiNoticeShown — B4: показывали ли уже предупреждение о трансграничной передаче
    // (152-ФЗ ст.12) перед AI-чатом в текущей сессии; чтобы не дублировать на каждое сообщение.
    initial: () => ({ step: null, data: {}, tariffPage: 0, chatHistory: [], aiNoticeShown: false }),
  })
);

// Track every user interaction. trackUser сам глушит свои ошибки (сбой трекинга не
// должен блокировать обработку сообщения), но всё равно await-им, чтобы lastSeenAt
// успел записаться до следующего обработчика (например /stats в той же сессии).
bot.use(async (ctx, next) => {
  await trackUser(ctx);
  return next();
});

// ─────────────────────────────────────────────────────────────
// DATA: EXPERTS
// ─────────────────────────────────────────────────────────────

const EXPERTS = [
  {
    name: "Дмитрий Сизов",
    role: "Основатель AI Legal · Управляющий партнёр",
    desc: "Создатель курса и методологии внедрения AI в юридическую практику. Руководит стратегическим развитием проекта.",
    emoji: "👨‍💼",
  },
  {
    name: "Владислав Галкин",
    role: "Директор по AI-дизайну",
    desc: "Специалист по нейросетям для визуального контента. Legal Design, Midjourney, генерация маркетинговых материалов.",
    emoji: "🎨",
  },
  {
    name: "Василий Артин",
    role: "AI-консультант",
    desc: "Консультант по AI-решениям для анализа договоров и генерации юридических документов.",
    emoji: "🧠",
  },
  {
    name: "Дмитрий Путин",
    role: "Эксперт по AI-автоматизации",
    desc: "Автоматизация юридических бизнес-процессов. Интеграция AI-решений в существующие workflow.",
    emoji: "🤖",
  },
  {
    name: "Егор Шабалин",
    role: "AI-стратег · Технический директор",
    desc: "Архитектура AI-решений для юридического бизнеса. Внедрение и масштабирование AI-инструментов.",
    emoji: "📐",
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: TARIFFS
// ─────────────────────────────────────────────────────────────

const TARIFFS = [
  {
    name: "Старт",
    price: "9 900 ₽",
    monthly: "от 825 ₽/мес",
    icon: "⚡",
    features: [
      "8 уроков в записи + обновления",
      "Обзорный модуль по банкротству",
      "Чат поддержки потока",
      "Сертификат Expertum × АСПБ",
    ],
    tag: "basic",
  },
  {
    name: "Практик",
    price: "24 900 ₽",
    monthly: "от 2 075 ₽/мес",
    icon: "★",
    features: [
      "Всё из тарифа «Старт»",
      "Библиотека промптов и шаблонов БФЛ",
      "Живые практикумы и разборы дел (5–6)",
      "Блок «Этика, тайна, безопасность»",
      "Выпускной кейс + закрытое комьюнити",
      "Удостоверение о ПК + вычет 13%",
    ],
    tag: "premium",
  },
  {
    name: "Внедрение",
    price: "49 900 ₽",
    monthly: "от 4 158 ₽/мес",
    icon: "◆",
    features: [
      "Всё из тарифа «Практик»",
      "Модуль «Свой стек»: MCP, парсер КАД, TG-бот",
      "Регламент использования ИИ в фирме",
      "1:1 сессия внедрения и разбор дела",
      "RAG-база по вашим делам",
    ],
    tag: "vip",
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: PRODUCTS
// ─────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: "course",
    name: "AI-Курс для юристов",
    icon: "🎓",
    shortDesc: "8-недельный онлайн-курс с практикой и поддержкой",
    fullDesc:
      "Комплексный курс по внедрению нейросетей в юридическую практику.\n\n" +
      "• 4 модуля, 8 недель обучения\n" +
      "• 40+ практических заданий\n" +
      "• Работа с ChatGPT, Claude, Midjourney\n" +
      "• Промпты для юристов\n" +
      "• Чат с поддержкой и однокурсниками\n\n" +
      "<b>Старт ближайшего потока:</b> узнайте у менеджера",
  },
  {
    id: "seminar",
    name: "Живой семинар",
    icon: "🎤",
    shortDesc: "Однодневный семинар-погружение для юристов",
    fullDesc:
      "Живой семинар с демонстрацией AI-инструментов в реальном времени.\n\n" +
      "• Полный день интенсивной практики\n" +
      "• Демонстрация работы нейросетей на реальных кейсах\n" +
      "• Ответы на вопросы в живом формате\n" +
      "• Нетворкинг с коллегами-юристами\n" +
      "• Кофе-брейки включены\n\n" +
      "<b>Формат:</b> очно\n" +
      "<b>Площадка:</b> Bubble, Саратов",
  },
  {
    id: "workshop",
    name: "Очный практикум",
    icon: "🏢",
    shortDesc: "Двухдневный воркшоп в малых группах",
    fullDesc:
      "Практикум с погружением в AI-инструменты под руководством экспертов.\n\n" +
      "• 2 дня интенсивной практики\n" +
      "• Работа на вашем ноутбуке\n" +
      "• Настройка AI-инструментов вместе\n" +
      "• Решаете свои реальные кейсы с AI\n" +
      "• Нетворкинг с коллегами\n" +
      "• Обед и кофе-брейки включены\n\n" +
      "<b>Площадка:</b> Bubble, Саратов",
  },
  {
    id: "automation",
    name: "Автоматизация юрфирмы",
    icon: "🤖",
    shortDesc: "Аудит + внедрение AI-инструментов в вашу практику",
    fullDesc:
      "Индивидуальный проект автоматизации для вашей юр. фирмы.\n\n" +
      "• Аудит текущих процессов\n" +
      "• Подбор AI-инструментов\n" +
      "• Настройка и интеграция\n" +
      "• Обучение сотрудников\n" +
      "• Поддержка 3 месяца\n\n" +
      "<b>Стоимость:</b> от 200 000 ₽ (зависит от масштаба задачи)",
  },
  {
    id: "corporate",
    name: "Корпоративное обучение",
    icon: "🏛",
    shortDesc: "Программа обучения для команды юристов",
    fullDesc:
      "Корпоративная программа обучения AI для юридических команд.\n\n" +
      "• Адаптация программы под компанию\n" +
      "• Обучение от 5 до 100 человек\n" +
      "• Выделенный куратор\n" +
      "• Отчёты о прогрессе\n" +
      "• Корпоративная лицензия на промпты\n\n" +
      "<b>Формат:</b> онлайн или выезд в офис",
  },
  {
    id: "services",
    name: "Услуги команды",
    icon: "⚡",
    shortDesc: "Разработка AI-решений на заказ",
    fullDesc:
      "Индивидуальная разработка AI-решений для юридического бизнеса.\n\n" +
      "• Разработка кастомных промптов\n" +
      "• Интеграция с вашими системами\n" +
      "• Создание AI-ботов и ассистентов\n" +
      "• Аналитика и отчётность\n" +
      "• Техническая поддержка\n\n" +
      "<b>Обсудим ваш запрос:</b> оставьте заявку",
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: PROGRAM
// ─────────────────────────────────────────────────────────────

const PROGRAM = [
  {
    num: "01",
    title: "Введение в нейросети для юристов",
    items: [
      "LLM: ChatGPT, Claude, GigaChat, YandexGPT",
      "Безопасность данных и адвокатская тайна",
      "Основы Prompt Engineering",
      "Настройка рабочего окружения",
    ],
  },
  {
    num: "02",
    title: "AI в судебно-претензионной работе",
    items: [
      "Анализ судебной практики",
      "Генерация исков и возражений",
      "Формирование правовых позиций",
      "Суммаризация дел и документов",
    ],
  },
  {
    num: "03",
    title: "Договорная работа и комплаенс",
    items: [
      "Проверка контрагентов (Due Diligence)",
      "Генерация и анализ договоров",
      "Сравнение версий документов",
      "Комплаенс-процедуры с AI",
    ],
  },
  {
    num: "04",
    title: "Маркетинг и визуал для юриста",
    items: [
      "Контент-план и посты для соцсетей",
      "Кейсы и публикации с AI",
      "Midjourney для Legal Design",
      "Создание сайта и лендингов",
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: FAQ
// ─────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Нужно ли уметь программировать?",
    a: "Нет! Навыки программирования не требуются. Мы учим общаться с нейросетями на естественном языке и использовать готовые интерфейсы.",
  },
  {
    q: "Безопасно ли загружать документы в AI?",
    a: "Безопасность — ключевой блок нашего курса. Мы разбираем, как обезличивать данные и соблюдать адвокатскую тайну при работе с AI.",
  },
  {
    q: "Подойдёт ли студентам юрфака?",
    a: "Да! Курс даст огромное конкурентное преимущество при поиске работы. Вы сможете выполнять задачи уровня junior+ значительно быстрее.",
  },
  {
    q: "Какие нейросети будем изучать?",
    a: "ChatGPT (GPT-4), Claude, Midjourney, Gemini, Perplexity. Также отечественные: YandexGPT, GigaChat.",
  },
  {
    q: "Есть рассрочка?",
    a: "Да, рассрочка на 12 месяцев без переплат. Также возможен возврат 13% через налоговый вычет на образование.",
  },
  {
    q: "Есть гарантия возврата?",
    a: "Если в течение первых 7 дней курс не подойдёт — вернём 100% стоимости без вопросов.",
  },
];

// ─────────────────────────────────────────────────────────────
// DATA: LEAD MAGNET (5 free prompts)
// ─────────────────────────────────────────────────────────────

const LEAD_MAGNET_TEXT =
  `<b>🎁 5 бесплатных промптов для юристов</b>\n` +
  `<i>Используйте их в ChatGPT или Claude прямо сейчас</i>\n\n` +
  `──────────────────────────\n\n` +
  `<b>1. Анализ договора</b>\n` +
  `<code>Проанализируй этот договор. Выдели: стороны, предмет, ключевые обязательства, сроки, ` +
  `штрафные санкции, риски для [моей стороны]. Представь в виде таблицы.</code>\n\n` +
  `<b>2. Генерация иска</b>\n` +
  `<code>Составь исковое заявление в [суд] от [истец] к [ответчик] о [предмет]. ` +
  `Требования: [сумма/действие]. Основания: [статьи закона]. Приложи ссылки на судебную практику.</code>\n\n` +
  `<b>3. Правовая позиция</b>\n` +
  `<code>Сформируй правовую позицию по вопросу: [описание ситуации]. ` +
  `Приведи нормы права, судебную практику ВС РФ, аргументы за и против.</code>\n\n` +
  `<b>4. Проверка контрагента</b>\n` +
  `<code>Составь чек-лист проверки контрагента [название]. ` +
  `Укажи источники для проверки, красные флаги, на что обратить внимание при Due Diligence.</code>\n\n` +
  `<b>5. Пост для соцсетей</b>\n` +
  `<code>Напиши экспертный пост для Telegram-канала юриста на тему [тема]. ` +
  `Стиль: профессиональный, но доступный. Длина: 1000-1500 знаков. Добавь call-to-action.</code>\n\n` +
  `──────────────────────────\n\n` +
  `<b>Хотите больше?</b> В полном курсе — 50+ продвинутых промптов для юристов.`;

// ─────────────────────────────────────────────────────────────
// HELPERS: KEYBOARDS
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// MANYASHA AI CHAT ENGINE
// ─────────────────────────────────────────────────────────────

const MANYASHA_SYSTEM_PROMPT = `Ты — Маняша, милый AI-помощник в Telegram-боте курса "Нейросети для юристов" (AI Legal).
Ты выглядишь как матрёшка в стиле гжель (сине-белая роспись) и держишь книжку "Федеральный закон №127".

Твоя задача — помогать пользователям в Telegram:
- Отвечать на вопросы о курсе
- Рассказывать о программе обучения (4 модуля, 8 недель)
- Помогать выбрать тариф (Старт 9 900₽, Практик 24 900₽, Внедрение 49 900₽)
- Объяснять, как AI помогает юристам

Информация о курсе:
- Курс "Нейросети для юристов" — практический курс от экспертов-юристов
- 500+ выпускников, 98% рекомендуют, 5 спикеров
- Экономия до 40 часов в месяц
- Старт ближайшего потока: 15 Июля 2026
- Всего 100 мест на поток
- Основатель: Дмитрий Сизов
- Эксперты: Владислав Галкин (AI-дизайн), Василий Артин (AI-консультант), Дмитрий Путин (AI-автоматизация), Егор Шабалин (AI-стратег)
- Продукты: AI-Курс, Живой семинар (Bubble, Саратов), Практикум AI-Lab (2 дня), Автоматизация юрфирмы (от 200 000₽), Корпоративное обучение, Услуги команды
- Сайт: ${SITE_URL}

Команды бота (подсказывай пользователям):
- /products — Продукты и услуги
- /tariffs — Тарифы курса
- /program — Программа обучения
- /experts — Наши эксперты
- /apply — Оставить заявку
- /faq — Частые вопросы

Правила:
- Отвечай коротко и дружелюбно (2-4 предложения)
- Используй эмодзи умеренно
- Говори на русском языке
- Если не знаешь ответ, предложи подходящую команду бота или посетить сайт
- Не придумывай информацию, которой нет в контексте
- Если пользователь хочет записаться, предложи команду /apply`;

async function askManyashaAI(userText, chatHistory) {
  if (!NAVI_API_KEY) return null;

  // Keep last 10 messages for context
  const trimmed = chatHistory.slice(-10);
  trimmed.push({ role: "user", content: userText });

  try {
    const response = await fetch(`${NAVI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NAVI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: MANYASHA_SYSTEM_PROMPT },
          ...trimmed,
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("[ManyashaAI] API error:", response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error("[ManyashaAI] Fetch error:", e.message);
    return null;
  }
}

function mainKeyboard() {
  return new Keyboard()
    .text("🛍 Наши продукты")
    .text("💰 Тарифы")
    .row()
    .text("📋 Программа курса")
    .text("👨‍🏫 Эксперты")
    .row()
    .text("❓ Частые вопросы")
    .text("📝 Оставить заявку")
    .row()
    .text("🪆 Спросить Маняшу")
    .text("🌐 Открыть сайт")
    .resized();
}

function isAdmin(ctx) {
  if (!ADMIN_CHAT_ID) return false;
  return String(ctx.from?.id) === String(ADMIN_CHAT_ID);
}

// ─────────────────────────────────────────────────────────────
// HELPERS: ADMIN NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

async function notifyAdmin(text) {
  if (!ADMIN_CHAT_ID || ADMIN_CHAT_ID === "123456789") return;
  try {
    await bot.api.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: "HTML" });
  } catch (e) {
    console.error("[AdminNotify] Failed:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// SITE LOGIN: "Войти через Telegram" deep-link confirmation
// ─────────────────────────────────────────────────────────────

/**
 * The site opens t.me/<bot>?start=auth_<code>. When the user presses Start we
 * confirm their Telegram identity to the site over the shared ADMIN_PASSWORD
 * secret; the site then logs the waiting browser in.
 */
async function handleTelegramAuth(ctx, code) {
  const from = ctx.from;
  if (!BOT_SHARED_SECRET) {
    await ctx.reply(
      "⚠️ Вход через сайт временно недоступен. Сообщите администратору.",
    );
    return;
  }
  try {
    const res = await fetch(`${API_URL}/api/auth/telegram/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": BOT_SHARED_SECRET,
      },
      body: JSON.stringify({
        code,
        telegramId: String(from?.id ?? ""),
        telegramUsername: from?.username || "",
        firstName: from?.first_name || "",
      }),
    });

    if (res.ok) {
      await ctx.reply(
        `✅ <b>Вход подтверждён!</b>\n\n` +
          `Вернитесь на сайт — личный кабинет уже открыт. 🪆`,
        { parse_mode: "HTML", reply_markup: mainKeyboard() },
      );
    } else if (res.status === 410) {
      await ctx.reply(
        "⏳ Ссылка для входа устарела. Откройте сайт и нажмите «Войти через Telegram» заново.",
      );
    } else {
      await ctx.reply(
        "⚠️ Не удалось подтвердить вход. Попробуйте ещё раз с сайта.",
      );
    }
  } catch (e) {
    console.error("[TelegramAuth] Failed:", e.message);
    await ctx.reply("⚠️ Сервер сайта недоступен. Попробуйте позже.");
  }
}

// ─────────────────────────────────────────────────────────────
// SET BOT COMMANDS
// ─────────────────────────────────────────────────────────────

async function setBotCommands() {
  try {
    await bot.api.setMyCommands([
      { command: "start", description: "Главное меню" },
      { command: "products", description: "Наши продукты" },
      { command: "tariffs", description: "Тарифы курса" },
      { command: "program", description: "Программа курса" },
      { command: "experts", description: "Эксперты курса" },
      { command: "faq", description: "Частые вопросы" },
      { command: "apply", description: "Оставить заявку" },
      { command: "reklama", description: "Подписаться на рассылку" },
      { command: "stop", description: "Отписаться от рассылки" },
      { command: "help", description: "Справка по командам" },
    ]);
    console.log("[Commands] Bot commands set successfully");
  } catch (e) {
    console.error("[Commands] Failed to set commands:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// COMMAND: /start — Welcome funnel
// ─────────────────────────────────────────────────────────────

bot.command("start", async (ctx) => {
  // Deep-link payload after /start (e.g. "auth_<code>" for site login)
  const payload = typeof ctx.match === "string" ? ctx.match.trim() : "";
  if (payload.startsWith("auth_")) {
    await handleTelegramAuth(ctx, payload.slice(5));
    return;
  }

  // BUG_FIX_CONTEXT: раньше /start не сбрасывал step, поэтому обещанный в режиме AI-чата
  // выход «нажми /start» не работал — следующее сообщение снова уходило в AI. /start
  // всегда возвращает в главное меню, значит сбрасываем активный шаг диалога.
  ctx.session.step = null;

  const name = esc(ctx.from?.first_name) || "друг";

  const welcomeText =
    `${name}, добро пожаловать в <b>AI Legal Academy</b>.\n\n` +
    `Здесь юристы осваивают нейросети для реальной работы — разбор договоров, подготовка исков и правовых позиций, Due Diligence, Legal Design. Без хайпа: только инструменты, которые экономят часы каждый день.\n\n` +
    `С чего начать:\n` +
    `🎁 Заберите бесплатный гайд — 5 промптов, готовых к работе уже сейчас.\n` +
    `🛍 Или загляните в продукты и тарифы в меню ниже.`;

  const inlineKb = new InlineKeyboard()
    .text("🎁 Получить бесплатный гайд", "lead_magnet_start")
    .row()
    .text("🛍 Наши продукты", "show_products")
    .text("💰 Тарифы", "show_tariffs")
    .row()
    .url("🌐 Открыть сайт", SITE_URL);

  await ctx.reply(welcomeText, {
    parse_mode: "HTML",
    reply_markup: mainKeyboard(),
  });

  await ctx.reply("Начните с бесплатного гайда или выберите интересующий раздел:", {
    reply_markup: inlineKb,
  });
});

// ─────────────────────────────────────────────────────────────
// LEAD MAGNET FLOW
// ─────────────────────────────────────────────────────────────

bot.callbackQuery("lead_magnet_start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "lead_name";
  ctx.session.data = { source: "lead_magnet" };
  await ctx.editMessageText(
    `🎁 <b>Бесплатный гайд: 5 промптов для юристов</b>\n\n` +
      `Чтобы отправить вам гайд, мне нужно узнать пару деталей.\n\n` +
      `Продолжая, вы подтверждаете, что вам есть 18 лет, и даёте согласие на обработку ` +
      `персональных данных (<a href="${SITE_URL}/legal/privacy">политика</a>).\n\n` +
      `Введите ваше <b>имя</b>:`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
  );
});

// ─────────────────────────────────────────────────────────────
// COMMAND: /products — Product catalog
// ─────────────────────────────────────────────────────────────

bot.command("products", handleProducts);
bot.hears("🛍 Наши продукты", handleProducts);

bot.callbackQuery("show_products", async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendProducts(ctx, false);
});

async function handleProducts(ctx) {
  await sendProducts(ctx, true);
}

async function sendProducts(ctx, isNewMessage) {
  const text =
    `🛍 <b>Наши продукты и услуги</b>\n\n` +
    `──────────────────────────\n\n` +
    `Выберите продукт, чтобы узнать подробности 👇`;

  const kb = new InlineKeyboard();
  PRODUCTS.forEach((p) => {
    kb.text(`${p.icon} ${p.name}`, `product_${p.id}`).row();
  });

  if (isNewMessage) {
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
  } else {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
  }
}

PRODUCTS.forEach((product) => {
  bot.callbackQuery(`product_${product.id}`, async (ctx) => {
    await ctx.answerCallbackQuery();
    const text =
      `${product.icon} <b>${product.name}</b>\n` +
      `<i>${product.shortDesc}</i>\n\n` +
      `──────────────────────────\n\n` +
      product.fullDesc;

    const kb = new InlineKeyboard()
      .text("📝 Оставить заявку", `apply_product_${product.id}`)
      .row()
      .text("« Назад к продуктам", "back_products");

    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
  });
});

bot.callbackQuery("back_products", async (ctx) => {
  await ctx.answerCallbackQuery();
  await sendProducts(ctx, false);
});

bot.callbackQuery(/^apply_product_/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const productId = ctx.callbackQuery.data.replace("apply_product_", "");
  const product = PRODUCTS.find((p) => p.id === productId);
  ctx.session.step = "name";
  ctx.session.data = { product: product ? product.name : productId };
  await ctx.reply(
    `📝 <b>Заявка: ${product ? product.name : productId}</b>\n\n${CONSENT_NOTICE}\n\nВведите ваше <b>имя</b>:`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
  );
});

// ─────────────────────────────────────────────────────────────
// COMMAND: /tariffs — Carousel navigation
// ─────────────────────────────────────────────────────────────

bot.command("tariffs", handleTariffs);
bot.hears("💰 Тарифы", handleTariffs);

bot.callbackQuery("show_tariffs", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.tariffPage = 0;
  const text = buildTariffCard(0);
  const kb = buildTariffKeyboard(0);
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
});

async function handleTariffs(ctx) {
  ctx.session.tariffPage = 0;
  const text = buildTariffCard(0);
  const kb = buildTariffKeyboard(0);
  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}

function buildTariffCard(index) {
  const t = TARIFFS[index];
  const features = t.features.map((f) => `  ✅ ${f}`).join("\n");
  return (
    `${t.icon} <b>${t.name}</b>  —  ${index + 1}/${TARIFFS.length}\n\n` +
    `──────────────────────────\n\n` +
    `💵 <b>${t.price}</b> (${t.monthly})\n\n` +
    `${features}\n\n` +
    `──────────────────────────\n` +
    `📌 Рассрочка на 12 мес. без переплат\n` +
    `📌 Гарантия возврата 7 дней\n` +
    `📌 Налоговый вычет 13%`
  );
}

function buildTariffKeyboard(index) {
  const t = TARIFFS[index];
  const kb = new InlineKeyboard();

  const navRow = [];
  if (index > 0) navRow.push({ text: "◀ Назад", callback_data: `tariff_nav_${index - 1}` });
  if (index < TARIFFS.length - 1) navRow.push({ text: "Вперёд ▶", callback_data: `tariff_nav_${index + 1}` });
  if (navRow.length > 0) {
    navRow.forEach((btn) => kb.text(btn.text, btn.callback_data));
    kb.row();
  }

  kb.text(`📝 Записаться на ${t.name}`, `apply_tariff_${t.tag}`).row();
  kb.text("📊 Сравнить все тарифы", "compare_tariffs").row();
  kb.url("Смотреть на сайте", `${SITE_URL}/#tariffs`);

  return kb;
}

bot.callbackQuery(/^tariff_nav_/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = parseInt(ctx.callbackQuery.data.replace("tariff_nav_", ""), 10);
  ctx.session.tariffPage = page;
  const text = buildTariffCard(page);
  const kb = buildTariffKeyboard(page);
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
});

bot.callbackQuery("compare_tariffs", async (ctx) => {
  await ctx.answerCallbackQuery();

  const text =
    `📊 <b>Сравнение тарифов</b>\n\n` +
    `<pre>` +
    `┌─────────────┬──────────┬──────────┬──────────┐\n` +
    `│             │  Старт   │ Практик  │Внедрение │\n` +
    `├─────────────┼──────────┼──────────┼──────────┤\n` +
    `│ Цена        │  9 900   │  24 900  │  49 900  │\n` +
    `│ 8 уроков    │    ✓     │    ✓     │    ✓     │\n` +
    `│ Обзор БФЛ   │    ✓     │    ✓     │    ✓     │\n` +
    `│ Сертификат  │    ✓     │    ✓     │    ✓     │\n` +
    `│ Шаблоны БФЛ │    ✕     │    ✓     │    ✓     │\n` +
    `│ Разборы дел │    ✕     │    ✓     │    ✓     │\n` +
    `│ Этика/152ФЗ │    ✕     │    ✓     │    ✓     │\n` +
    `│ Комьюнити   │    ✕     │    ✓     │    ✓     │\n` +
    `│ Удостов.+13%│    ✕     │    ✓     │    ✓     │\n` +
    `│ Свой стек   │    ✕     │    ✕     │    ✓     │\n` +
    `│ Регламент   │    ✕     │    ✕     │    ✓     │\n` +
    `│ 1:1 внедрен.│    ✕     │    ✕     │    ✓     │\n` +
    `└─────────────┴──────────┴──────────┴──────────┘` +
    `</pre>`;

  const kb = new InlineKeyboard()
    .text("⚡ Старт", "apply_tariff_basic")
    .text("★ Практик", "apply_tariff_premium")
    .text("◆ Внедрение", "apply_tariff_vip")
    .row()
    .text("« Вернуться к тарифам", "back_to_tariff_carousel");

  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
});

bot.callbackQuery("back_to_tariff_carousel", async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = ctx.session.tariffPage || 0;
  const text = buildTariffCard(page);
  const kb = buildTariffKeyboard(page);
  await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: kb });
});

bot.callbackQuery(/^apply_tariff_/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const tag = ctx.callbackQuery.data.replace("apply_tariff_", "");
  const tariff = TARIFFS.find((t) => t.tag === tag);
  const tariffName = tariff ? tariff.name : tag;
  ctx.session.step = "name";
  ctx.session.data = { tariff: tariffName };
  await ctx.reply(
    `📝 <b>Заявка на тариф «${tariffName}»</b>\n\n${CONSENT_NOTICE}\n\nВведите ваше <b>имя</b>:`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
  );
});

// ─────────────────────────────────────────────────────────────
// COMMAND: /program
// ─────────────────────────────────────────────────────────────

bot.command("program", handleProgram);
bot.hears("📋 Программа курса", handleProgram);

async function handleProgram(ctx) {
  let text =
    `📋 <b>Программа курса AI Legal</b>\n` +
    `<i>4 модуля • 8 недель • 40+ практических заданий</i>\n\n` +
    `──────────────────────────\n\n`;

  for (const m of PROGRAM) {
    text += `📌 <b>Модуль ${m.num}: ${m.title}</b>\n`;
    for (const item of m.items) {
      text += `    • ${item}\n`;
    }
    text += "\n";
  }

  text +=
    `──────────────────────────\n` +
    `🚀 После курса вы сможете автоматизировать до 70% рутинных задач`;

  const kb = new InlineKeyboard()
    .text("📝 Записаться на курс", "apply_tariff_basic")
    .row()
    .url("Подробнее на сайте", `${SITE_URL}/#program`);

  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}

// ─────────────────────────────────────────────────────────────
// COMMAND: /experts
// ─────────────────────────────────────────────────────────────

bot.command("experts", handleExperts);
bot.hears("👨‍🏫 Эксперты", handleExperts);

async function handleExperts(ctx) {
  let text =
    `👨‍🏫 <b>Наши эксперты</b>\n\n` +
    `──────────────────────────\n\n`;

  for (const e of EXPERTS) {
    text +=
      `${e.emoji} <b>${e.name}</b>\n` +
      `<i>${e.role}</i>\n` +
      `${e.desc}\n\n`;
  }

  text +=
    `──────────────────────────\n` +
    `Все эксперты — практики с опытом внедрения AI в юридический бизнес.`;

  const kb = new InlineKeyboard()
    .text("📝 Записаться на курс", "apply_tariff_basic")
    .row()
    .url("О команде на сайте", `${SITE_URL}/#experts`);

  await ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
}

// ─────────────────────────────────────────────────────────────
// COMMAND: /faq
// ─────────────────────────────────────────────────────────────

bot.command("faq", handleFaq);
bot.hears("❓ Частые вопросы", handleFaq);

async function handleFaq(ctx) {
  const kb = new InlineKeyboard();
  FAQ_ITEMS.forEach((f, i) => {
    kb.text(f.q, `faq_${i}`).row();
  });
  await ctx.reply(
    `❓ <b>Частые вопросы</b>\n\n` +
      `──────────────────────────\n\n` +
      `Выберите вопрос 👇`,
    { parse_mode: "HTML", reply_markup: kb }
  );
}

FAQ_ITEMS.forEach((f, i) => {
  bot.callbackQuery(`faq_${i}`, async (ctx) => {
    await ctx.answerCallbackQuery();
    const kb = new InlineKeyboard()
      .text("« Назад к вопросам", "back_faq")
      .row()
      .text("📝 Записаться на курс", "apply_tariff_basic");
    await ctx.editMessageText(
      `<b>${f.q}</b>\n\n${f.a}`,
      { parse_mode: "HTML", reply_markup: kb }
    );
  });
});

bot.callbackQuery("back_faq", async (ctx) => {
  await ctx.answerCallbackQuery();
  const kb = new InlineKeyboard();
  FAQ_ITEMS.forEach((f, i) => {
    kb.text(f.q, `faq_${i}`).row();
  });
  await ctx.editMessageText(
    `❓ <b>Частые вопросы</b>\n\n` +
      `──────────────────────────\n\n` +
      `Выберите вопрос 👇`,
    { parse_mode: "HTML", reply_markup: kb }
  );
});

// ─────────────────────────────────────────────────────────────
// COMMAND: /apply — Application flow
// ─────────────────────────────────────────────────────────────

bot.command("apply", handleApply);
bot.hears("📝 Оставить заявку", handleApply);

async function handleApply(ctx) {
  ctx.session.step = "name";
  ctx.session.data = {};
  await ctx.reply(
    `📝 <b>Заявка на курс AI Legal</b>\n\n` +
      `──────────────────────────\n\n` +
      `Давайте оформим заявку! Это займёт 1 минуту.\n\n` +
      `${CONSENT_NOTICE}\n\n` +
      `Введите ваше <b>имя</b>:`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
  );
}

// ─────────────────────────────────────────────────────────────
// COMMAND: /help
// ─────────────────────────────────────────────────────────────

bot.command("help", async (ctx) => {
  await ctx.reply(
    `📖 <b>Справка по командам</b>\n\n` +
      `──────────────────────────\n\n` +
      `/start — Главное меню\n` +
      `/products — Наши продукты и услуги\n` +
      `/tariffs — Тарифы курса\n` +
      `/program — Программа курса\n` +
      `/experts — Эксперты курса\n` +
      `/faq — Частые вопросы\n` +
      `/apply — Оставить заявку\n` +
      `/reklama — Подписаться на рассылку\n` +
      `/stop — Отписаться от рассылки\n` +
      `/help — Эта справка\n\n` +
      `──────────────────────────\n\n` +
      `Также вы можете использовать кнопки меню внизу экрана.`,
    { parse_mode: "HTML", reply_markup: mainKeyboard() }
  );
});

// ─────────────────────────────────────────────────────────────
// D1 (ст.18 149-ФЗ): управление маркетинговым согласием
// /reklama — подписка на рекламные сообщения; /stop — отписка (ОБЯЗАТЕЛЬНА по 149-ФЗ)
// ─────────────────────────────────────────────────────────────

bot.command("reklama", async (ctx) => {
  // Предварительное согласие адресата на рекламу по сетям связи (ст.18 149-ФЗ).
  await setMarketingConsent(ctx, true);
  await ctx.reply(
    `✅ <b>Вы подписались на рассылку</b>\n\n` +
      `Теперь вы будете получать новости о курсе, акциях и полезных материалах.\n\n` +
      `Отписаться в любой момент можно командой /stop.`,
    { parse_mode: "HTML" }
  );
});

bot.command("stop", async (ctx) => {
  // Обязательный механизм отзыва согласия на рекламу (ст.18 149-ФЗ).
  await setMarketingConsent(ctx, false);
  await ctx.reply(
    `🔕 <b>Вы отписались от рассылки</b>\n\n` +
      `Больше не будем присылать рекламные сообщения.\n\n` +
      `Снова подписаться можно командой /reklama.`,
    { parse_mode: "HTML" }
  );
});

// ─────────────────────────────────────────────────────────────
// MANYASHA AI — Keyboard button handler
// ─────────────────────────────────────────────────────────────

bot.hears("🪆 Спросить Маняшу", async (ctx) => {
  ctx.session.step = "manyasha_chat";
  ctx.session.chatHistory = [];
  // B4: предупреждение AI_NOTICE показываем прямо в этом приветствии (ниже), поэтому
  // помечаем aiNoticeShown=true — чтобы не продублировать его в свободном AI-фолбэке.
  ctx.session.aiNoticeShown = true;
  await ctx.reply(
    `🪆 <b>Маняша слушает!</b>\n\n` +
      `Привет! Я Маняша — твой AI-помощник по курсу "Нейросети для юристов" 🎓\n\n` +
      `Задай мне любой вопрос о курсе, программе, тарифах или экспертах.\n\n` +
      // B4 (152-ФЗ, ст.12): предупреждение о трансграничной передаче ПДн в AI-сервис.
      `${esc(AI_NOTICE)}\n\n` +
      `<i>Чтобы выйти из чата, нажми</i> /start`,
    { parse_mode: "HTML" }
  );
});

// ─────────────────────────────────────────────────────────────
// WebApp button — open site
// ─────────────────────────────────────────────────────────────

bot.hears("🌐 Открыть сайт", async (ctx) => {
  const kb = new InlineKeyboard()
    .webApp("🌐 Открыть сайт", SITE_URL)
    .row()
    .url("Открыть в браузере", SITE_URL);
  await ctx.reply(
    `🌐 <b>Сайт AI Legal Academy</b>\n\n` +
      `Откройте сайт прямо внутри Telegram или в браузере 👇`,
    { parse_mode: "HTML", reply_markup: kb }
  );
});

// ─────────────────────────────────────────────────────────────
// ADMIN: /admin, /broadcast, /stats
// ─────────────────────────────────────────────────────────────

bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx)) {
    return;
  }

  let todayLeads = 0;
  let totalLeads = 0;
  try {
    const res = await fetch(`${API_URL}/api/leads`, {
      headers: { "x-admin-password": ADMIN_PASSWORD },
    });
    if (res.ok) {
      const data = await res.json();
      const leads = Array.isArray(data) ? data : (data.leads || []);
      totalLeads = leads.length;
      const today = new Date().toISOString().slice(0, 10);
      todayLeads = leads.filter(
        (l) => l.createdAt && l.createdAt.slice(0, 10) === today
      ).length;
    }
  } catch (e) {
    // API unavailable, show what we can
  }

  const userCount = await getUserCount();
  const activeToday = await getActiveToday();

  await ctx.reply(
    `🔐 <b>Панель администратора</b>\n\n` +
      `──────────────────────────\n\n` +
      `👥 <b>Пользователи бота:</b> ${userCount}\n` +
      `📊 <b>Активны сегодня:</b> ${activeToday}\n\n` +
      `📋 <b>Всего заявок (API):</b> ${totalLeads}\n` +
      `📋 <b>Заявок сегодня:</b> ${todayLeads}\n\n` +
      `──────────────────────────\n\n` +
      `<b>Команды:</b>\n` +
      `/broadcast <i>текст</i> — рассылка всем пользователям\n` +
      `/stats — статистика`,
    { parse_mode: "HTML" }
  );
});

bot.command("stats", async (ctx) => {
  if (!isAdmin(ctx)) {
    return;
  }

  const userCount = await getUserCount();
  const activeToday = await getActiveToday();

  let totalLeads = 0;
  try {
    const res = await fetch(`${API_URL}/api/leads`, {
      headers: { "x-admin-password": ADMIN_PASSWORD },
    });
    if (res.ok) {
      const data = await res.json();
      const leads = Array.isArray(data) ? data : (data.leads || []);
      totalLeads = leads.length;
    }
  } catch (e) {
    // ignore
  }

  const conversionRate = userCount > 0 ? ((totalLeads / userCount) * 100).toFixed(1) : "0";

  await ctx.reply(
    `📊 <b>Статистика</b>\n\n` +
      `──────────────────────────\n\n` +
      `👥 Всего пользователей: <b>${userCount}</b>\n` +
      `📊 Активны сегодня: <b>${activeToday}</b>\n` +
      `📋 Всего заявок: <b>${totalLeads}</b>\n` +
      `📈 Конверсия: <b>${conversionRate}%</b>`,
    { parse_mode: "HTML" }
  );
});

/**
 * Send one broadcast message with retry/backoff. Honors Telegram's retry_after
 * on 429 and retries transient 5xx; treats permanent errors (e.g. 403 — user
 * blocked the bot) as a non-retryable failure. Returns true on delivery.
 */
async function sendBroadcastMessage(chatId, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await bot.api.sendMessage(chatId, message, { parse_mode: "HTML" });
      return true;
    } catch (e) {
      const retryAfter = e?.parameters?.retry_after;
      const code = e?.error_code;
      if (retryAfter) {
        await sleep(retryAfter * 1000 + 250);
        continue;
      }
      if (code === 429 || (code >= 500 && code < 600)) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return false; // permanent (blocked/deactivated/etc.)
    }
  }
  return false;
}

/**
 * Deliver a message to a marketing-consented audience with throttling (~25 msg/s,
 * under Telegram's ~30/s limit) and per-message retries. Shared by manual
 * /broadcast and the web-admin broadcast queue so both behave identically.
 *
 * За каждого получателя после отправки пишем строку BroadcastRecipient (C7,
 * ст.18 149-ФЗ — доказуемость того, что рассылка ушла только давшим согласие,
 * и с каким статусом доставки). telegramId — адрес; userId — связка с User.
 *
 * @param {Array<{id:number, telegramId:string}>} recipients — согласившаяся аудитория
 * @param {string} message — текст рассылки
 * @param {number} broadcastId — id строки Broadcast, к которой привязывать логи
 * @returns {Promise<{sent:number, failed:number}>}
 */
async function deliverToAll(recipients, message, broadcastId) {
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const ok = await sendBroadcastMessage(r.telegramId, message);
    if (ok) sent++;
    else failed++;

    // Пер-получательный лог доставки. Сбой записи лога НЕ должен ронять рассылку —
    // глушим ошибку, доставка уже произошла.
    try {
      await prisma.broadcastRecipient.create({
        data: {
          broadcastId,
          telegramId: r.telegramId,
          userId: r.id ?? null,
          status: ok ? "sent" : "failed",
          deliveredAt: ok ? new Date() : null,
        },
      });
    } catch (e) {
      console.error("[Broadcast][IMP:8][deliverToAll][RECIPIENT_LOG] сбой записи BroadcastRecipient [FAIL]", e.message);
    }

    await sleep(40);
  }
  return { sent, failed };
}

bot.command("broadcast", async (ctx) => {
  if (!isAdmin(ctx)) {
    return;
  }

  const text = ctx.message.text.replace(/^\/broadcast\s*/, "").trim();
  if (!text) {
    await ctx.reply("Использование: /broadcast <i>текст сообщения</i>", {
      parse_mode: "HTML",
    });
    return;
  }

  // D1 (ст.18 149-ФЗ): рассылаем только тем, кто дал маркетинговое согласие.
  // Раньше уходило getAllChatIds() — ВСЕМ, что нарушало 149-ФЗ.
  // BUG_FIX_CONTEXT: broadcast всем адресатам без проверки согласия — прямое
  // нарушение ст.18 149-ФЗ (реклама по сетям связи только с предварительного согласия).
  const recipients = await getMarketingChatIds();
  const totalUsers = (await getAllChatIds()).length;
  const filteredOut = totalUsers - recipients.length;

  if (recipients.length === 0) {
    // Нет согласий — корректная ситуация: рассылка не уходит (не ошибка).
    console.info(`[Broadcast] Отфильтровано без согласия: ${filteredOut}/${totalUsers}. Получателей нет — рассылка не отправлена.`);
    await ctx.reply(
      `📭 <b>Рассылка не отправлена</b>\n\n` +
        `Ни один пользователь не дал согласие на рекламные сообщения (ст.18 149-ФЗ).\n` +
        `Отфильтровано без согласия: ${filteredOut} из ${totalUsers}.`,
      { parse_mode: "HTML" }
    );
    return;
  }

  console.info(`[Broadcast] Получателей с согласием: ${recipients.length}, отфильтровано: ${filteredOut}/${totalUsers}.`);

  // C7 (ст.18 149-ФЗ): фиксируем факт рассылки в Broadcast, затем на каждого получателя —
  // BroadcastRecipient (внутри deliverToAll). Ручной /broadcast не проходит через веб-очередь,
  // поэтому создаём строку Broadcast здесь сами.
  const broadcast = await prisma.broadcast.create({
    data: { message: text.slice(0, 4000), status: "sent", sentAt: new Date() },
  });

  const { sent, failed } = await deliverToAll(recipients, text, broadcast.id);

  // Итоговые счётчики доставки на строке Broadcast.
  await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: { sentCount: sent, failedCount: failed },
  });

  await ctx.reply(
    `📤 <b>Рассылка завершена</b>\n\n` +
      `✅ Доставлено: ${sent}\n` +
      `❌ Ошибки: ${failed}\n` +
      `📊 Получателей с согласием: ${recipients.length}\n` +
      `🔕 Отфильтровано без согласия: ${filteredOut}`,
    { parse_mode: "HTML" }
  );
});

// ─────────────────────────────────────────────────────────────
// SESSION FLOW: Lead magnet + Application form
// ─────────────────────────────────────────────────────────────

bot.on("message:text", async (ctx) => {
  // Cap length before anything is forwarded to the paid LLM.
  const text = ctx.message.text.slice(0, MAX_AI_INPUT);

  // ── Manyasha AI chat mode ──
  if (ctx.session.step === "manyasha_chat") {
    if (!aiRateLimitOk(ctx.from?.id ?? "anon")) {
      await ctx.reply("🪆 Слишком много сообщений подряд. Подожди минутку 🙏");
      return;
    }
    await ctx.replyWithChatAction("typing");

    const reply = await askManyashaAI(text, ctx.session.chatHistory || []);

    if (reply) {
      // Save to session history
      if (!ctx.session.chatHistory) ctx.session.chatHistory = [];
      ctx.session.chatHistory.push({ role: "user", content: text });
      ctx.session.chatHistory.push({ role: "assistant", content: reply });
      // Trim to last 20 messages
      if (ctx.session.chatHistory.length > 20) {
        ctx.session.chatHistory = ctx.session.chatHistory.slice(-20);
      }

      // LLM output is untrusted formatting — send as plain text (no parse_mode).
      await ctx.reply(`🪆 ${reply}`);
    } else {
      await ctx.reply(
        "🪆 Извини, не могу подключиться к серверу. Попробуй позже или используй команды бота! 🔌"
      );
    }
    return;
  }

  // ── No active flow → try Manyasha AI as fallback ──
  if (!ctx.session.step) {
    // Only respond to non-empty text that isn't a button label
    if (NAVI_API_KEY && text.length > 1) {
      if (!aiRateLimitOk(ctx.from?.id ?? "anon")) {
        return; // silently ignore over-limit free-form spam
      }
      // B4 (152-ФЗ, ст.12): текст пользователя уходит в сторонний AI-сервис. Один раз
      // за сессию, перед первым свободным AI-ответом, показываем предупреждение о
      // трансграничной передаче — не дублируем на каждое сообщение.
      if (!ctx.session.aiNoticeShown) {
        ctx.session.aiNoticeShown = true;
        await ctx.reply(esc(AI_NOTICE), { parse_mode: "HTML" });
      }
      await ctx.replyWithChatAction("typing");
      const reply = await askManyashaAI(text, []);
      if (reply) {
        await ctx.reply(`🪆 ${esc(reply)}\n\n<i>Совет: нажми «🪆 Спросить Маняшу» для полноценного диалога!</i>`, {
          parse_mode: "HTML",
        });
        return;
      }
    }
    return;
  }

  // Lead magnet flow: name -> phone -> send guide
  if (ctx.session.step === "lead_name") {
    ctx.session.data.name = text;
    ctx.session.step = "lead_phone";
    await ctx.reply("📱 Отлично! Теперь введите ваш <b>номер телефона</b>:", {
      parse_mode: "HTML",
    });
    return;
  }

  if (ctx.session.step === "lead_phone") {
    ctx.session.data.phone = text;
    ctx.session.step = null;

    // Save lead via API
    try {
      await fetch(`${API_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ctx.session.data.name,
          phone: ctx.session.data.phone,
          tariff: "Lead Magnet",
          source: "telegram_bot_guide",
          // Пользователь подтвердил согласие на старте флоу (см. lead_magnet_start)
          consent: true,
          marketingConsent: false,
        }),
      });
    } catch (e) {
      // API may be unavailable, continue anyway
    }

    // Notify admin
    await notifyAdmin(
      `🔔 <b>Новый лид (гайд)</b>\n\n` +
        `👤 ${esc(ctx.session.data.name)}\n` +
        `📱 ${esc(ctx.session.data.phone)}\n` +
        `📱 Telegram: @${esc(ctx.from?.username || "нет")}\n` +
        `🆔 ID: ${esc(ctx.from?.id)}`
    );

    // Send the guide
    await ctx.reply(LEAD_MAGNET_TEXT, { parse_mode: "HTML" });

    // Follow-up
    const kb = new InlineKeyboard()
      .text("🛍 Смотреть продукты", "show_products")
      .text("💰 Тарифы курса", "show_tariffs");
    await ctx.reply(
      `✅ Гайд отправлен! Попробуйте промпты прямо сейчас.\n\n` +
        `Хотите узнать больше о курсе? 👇`,
      { reply_markup: kb }
    );

    ctx.session.data = {};
    return;
  }

  // Application form flow: name -> phone -> email -> tariff -> submit
  if (ctx.session.step === "name") {
    ctx.session.data.name = text;
    ctx.session.step = "phone";
    await ctx.reply("📱 Введите ваш <b>номер телефона</b>:", {
      parse_mode: "HTML",
    });
    return;
  }

  if (ctx.session.step === "phone") {
    ctx.session.data.phone = text;
    ctx.session.step = "email";
    await ctx.reply(
      '📧 Введите ваш <b>email</b> (или отправьте «—» чтобы пропустить):',
      { parse_mode: "HTML" }
    );
    return;
  }

  if (ctx.session.step === "email") {
    const email = text === "—" || text === "-" ? null : text;
    ctx.session.data.email = email;

    if (!ctx.session.data.tariff && !ctx.session.data.product) {
      ctx.session.step = "tariff";
      const kb = new InlineKeyboard()
        .text("⚡ Старт", "select_basic")
        .row()
        .text("★ Практик", "select_premium")
        .row()
        .text("◆ Внедрение", "select_vip");
      await ctx.reply(
        "Выберите <b>тариф</b>:",
        { parse_mode: "HTML", reply_markup: kb }
      );
      return;
    }

    await submitLead(ctx);
    return;
  }
});

bot.callbackQuery(/^select_/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const tag = ctx.callbackQuery.data.replace("select_", "");
  const tariff = TARIFFS.find((t) => t.tag === tag);
  ctx.session.data.tariff = tariff ? tariff.name : tag;
  await submitLead(ctx);
});

async function submitLead(ctx) {
  const { name, phone, email, tariff, product } = ctx.session.data;
  ctx.session.step = null;

  const label = product || tariff || "Не выбрано";

  try {
    const res = await fetch(`${API_URL}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email,
        tariff: tariff || product || "Не выбрано",
        source: "telegram_bot",
        // Пользователь подтвердил согласие на старте флоу заявки
        consent: true,
        marketingConsent: false,
      }),
    });

    if (!res.ok) throw new Error("API error");
  } catch (e) {
    // API unavailable — still show confirmation
  }

  // Notify admin
  await notifyAdmin(
    `🔔 <b>Новая заявка</b>\n\n` +
      `👤 ${esc(name)}\n` +
      `📱 ${esc(phone)}\n` +
      `${email ? `📧 ${esc(email)}\n` : ""}` +
      `💼 ${esc(label)}\n` +
      `📱 Telegram: @${esc(ctx.from?.username || "нет")}\n` +
      `🆔 ID: ${esc(ctx.from?.id)}`
  );

  await ctx.reply(
    `✅ <b>Заявка отправлена!</b>\n\n` +
      `──────────────────────────\n\n` +
      `👤 <b>Имя:</b> ${esc(name)}\n` +
      `📱 <b>Телефон:</b> ${esc(phone)}\n` +
      `${email ? `📧 <b>Email:</b> ${esc(email)}\n` : ""}` +
      `💼 <b>Продукт:</b> ${esc(label)}\n\n` +
      `──────────────────────────\n\n` +
      `Наш менеджер свяжется с вами в ближайшее время! 🚀`,
    { parse_mode: "HTML", reply_markup: mainKeyboard() }
  );

  ctx.session.data = {};
}

// ─────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────

bot.catch((err) => {
  const ctx = err.ctx;
  const e = err.error;
  console.error(`[BotError] Update ${ctx?.update?.update_id}:`, e);
});

// Last-resort process guards: log instead of letting a stray rejection/throw
// kill the bot silently (PM2 would crash-loop). Keep the process alive.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// BROADCAST QUEUE POLLER — delivers broadcasts enqueued from the web admin
// ─────────────────────────────────────────────────────────────

let broadcastPolling = false;

async function pollBroadcastQueue() {
  if (broadcastPolling || !BOT_SHARED_SECRET) return;
  broadcastPolling = true;
  try {
    const res = await fetch(`${API_URL}/api/bot/broadcasts`, {
      headers: { "x-bot-secret": BOT_SHARED_SECRET },
    });
    if (!res.ok) return;
    const data = await res.json();
    const b = data.broadcast;
    if (!b || !b.message) return;

    // D1 (ст.18 149-ФЗ): и рассылка с сайта уходит только по маркетинговому согласию.
    // BUG_FIX_CONTEXT: раньше веб-рассылка шла getAllChatIds() — всем подряд, минуя
    // проверку согласия; фильтруем так же, как ручной /broadcast.
    const recipients = await getMarketingChatIds();
    const totalUsers = (await getAllChatIds()).length;
    const filteredOut = totalUsers - recipients.length;

    if (recipients.length === 0) {
      // Нет согласий — подтверждаем задачу сайту с нулевой доставкой (не зависаем в pending).
      console.info(`[BroadcastPoll] Отфильтровано без согласия: ${filteredOut}/${totalUsers}. Получателей нет — рассылка не отправлена.`);
      await fetch(`${API_URL}/api/bot/broadcasts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-secret": BOT_SHARED_SECRET,
        },
        body: JSON.stringify({ id: b.id, sentCount: 0, failedCount: 0 }),
      });
      await notifyAdmin(
        `📭 <b>Рассылка с сайта не отправлена</b>\n\nНет пользователей с согласием на рекламу (ст.18 149-ФЗ).\nОтфильтровано без согласия: ${filteredOut} из ${totalUsers}.`,
      );
      return;
    }

    console.info(`[BroadcastPoll] Получателей с согласием: ${recipients.length}, отфильтровано: ${filteredOut}/${totalUsers}.`);
    // Throttled delivery with per-message retries + per-recipient BroadcastRecipient
    // log (shared with /broadcast). У веб-рассылки строка Broadcast уже создана сайтом —
    // используем её b.id как broadcastId для логов получателей (C7, ст.18 149-ФЗ).
    const { sent, failed } = await deliverToAll(recipients, b.message, b.id);

    await fetch(`${API_URL}/api/bot/broadcasts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": BOT_SHARED_SECRET,
      },
      body: JSON.stringify({ id: b.id, sentCount: sent, failedCount: failed }),
    });

    await notifyAdmin(
      `📤 <b>Рассылка с сайта доставлена</b>\n\n✅ Доставлено: ${sent}\n❌ Ошибки: ${failed}\n🔕 Отфильтровано без согласия: ${filteredOut}`,
    );
  } catch (e) {
    console.error("[BroadcastPoll] Failed:", e.message);
  } finally {
    broadcastPolling = false;
  }
}

setInterval(pollBroadcastQueue, 15000);

// ─────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN — закрываем grammy long-polling и пул соединений Prisma
// ─────────────────────────────────────────────────────────────
//
// BUG_FIX_CONTEXT: без явного prisma.$disconnect() при остановке под PM2 висящие
// соединения к Postgres не освобождались сразу — при частых рестартах бота пул БД
// мог упереться в лимит подключений. Закрываем и long-polling, и клиента Prisma.
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Shutdown] Получен ${signal} — останавливаю бота...`);
  try {
    await bot.stop();
  } catch (e) {
    console.error("[Shutdown] Ошибка остановки бота:", e.message);
  }
  try {
    await prisma.$disconnect();
    console.log("[Shutdown] Prisma отключена.");
  } catch (e) {
    console.error("[Shutdown] Ошибка prisma.$disconnect:", e.message);
  }
  process.exit(0);
}
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

await setBotCommands();

bot.start({
  onStart: (info) => {
    console.log(`\n🤖 Bot @${info.username} started successfully`);
    console.log(`   Site: ${SITE_URL}`);
    console.log(`   API:  ${API_URL}`);
    console.log(`   Admin: ${ADMIN_CHAT_ID ? "configured" : "not set"}\n`);
  },
});
