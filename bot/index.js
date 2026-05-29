// FILE: bot/index.js
// VERSION: 2.0.0
// AI Legal Academy Telegram Bot — Enterprise Edition

import { Bot, Keyboard, InlineKeyboard, session } from "grammy";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─────────────────────────────────────────────────────────────
// ENV & CONFIG
// ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

const envFile = readFileSync(resolve(__dirname, ".env"), "utf-8");
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
const SITE_URL = env.SITE_URL || "https://ailegal.ru";
const API_URL = env.API_URL || "http://localhost:3099";
const ADMIN_CHAT_ID = env.ADMIN_CHAT_ID || "";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "";
const NAVI_API_KEY = env.NAVI_API_KEY || "";
const NAVI_BASE_URL = "https://api.navy/v1";
const AI_MODEL = "deepseek-chat";
const MAX_AI_INPUT = 1000; // cap user text forwarded to the paid LLM

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

const DATA_DIR = resolve(__dirname, "data");
const USERS_FILE = resolve(DATA_DIR, "users.json");

// ─────────────────────────────────────────────────────────────
// USER TRACKING
// ─────────────────────────────────────────────────────────────

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers() {
  try {
    if (existsSync(USERS_FILE)) {
      return JSON.parse(readFileSync(USERS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("[UserStore] Failed to load users.json:", e.message);
  }
  return {};
}

function saveUsers(users) {
  try {
    // mode 0o600 — readable/writable by the bot's user only (contains PII)
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), { encoding: "utf-8", mode: 0o600 });
  } catch (e) {
    console.error("[UserStore] Failed to save users.json:", e.message);
  }
}

function trackUser(ctx) {
  const from = ctx.from;
  if (!from) return;
  const users = loadUsers();
  const id = String(from.id);
  const now = new Date().toISOString();
  if (!users[id]) {
    users[id] = {
      telegram_id: from.id,
      first_name: from.first_name || "",
      username: from.username || "",
      first_seen: now,
      last_interaction: now,
    };
  } else {
    users[id].last_interaction = now;
    if (from.first_name) users[id].first_name = from.first_name;
    if (from.username) users[id].username = from.username;
  }
  saveUsers(users);
}

function getUserCount() {
  const users = loadUsers();
  return Object.keys(users).length;
}

function getActiveToday() {
  const users = loadUsers();
  const today = new Date().toISOString().slice(0, 10);
  return Object.values(users).filter(
    (u) => u.last_interaction && u.last_interaction.slice(0, 10) === today
  ).length;
}

function getAllChatIds() {
  const users = loadUsers();
  return Object.values(users).map((u) => u.telegram_id);
}

// ─────────────────────────────────────────────────────────────
// BOT INIT
// ─────────────────────────────────────────────────────────────

const bot = new Bot(BOT_TOKEN);

bot.use(
  session({
    initial: () => ({ step: null, data: {}, tariffPage: 0, chatHistory: [] }),
  })
);

// Track every user interaction
bot.use(async (ctx, next) => {
  trackUser(ctx);
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
    name: "Базовый",
    price: "45 000 ₽",
    monthly: "от 3 750 ₽/мес",
    icon: "📦",
    features: [
      "Все основные модули программы",
      "Доступ к платформе на 3 месяца",
      "Общий чат участников",
      "15 готовых промптов для юристов",
    ],
    tag: "basic",
  },
  {
    name: "Премиум",
    price: "75 000 ₽",
    monthly: "от 6 250 ₽/мес",
    icon: "⭐",
    features: [
      "Всё из Базового тарифа",
      "Доступ к AI-сервисам на 3 месяца",
      "Проверка домашних заданий",
      "Закрытые мастермайнды",
      "50+ продвинутых промптов",
      "Сертификат о прохождении",
      "🎁 В подарок — готовый сайт для юриста",
    ],
    tag: "premium",
  },
  {
    name: "VIP",
    price: "120 000 ₽",
    monthly: "от 10 000 ₽/мес",
    icon: "💎",
    features: [
      "Всё из тарифа Премиум",
      "Индивидуальные консультации с куратором",
      "Аудит процессов вашей юр. фирмы",
      "Доступ к AI-сервисам на 6 месяцев",
      "Персональный план внедрения AI",
      "Приоритетная поддержка 24/7",
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
      "✅ 4 модуля, 8 недель обучения\n" +
      "✅ 40+ практических заданий\n" +
      "✅ Работа с ChatGPT, Claude, Midjourney\n" +
      "✅ Промпты для юристов\n" +
      "✅ Чат с поддержкой и однокурсниками\n\n" +
      "<b>Старт ближайшего потока:</b> узнайте у менеджера",
  },
  {
    id: "seminar",
    name: "Живой семинар",
    icon: "🎤",
    shortDesc: "Однодневный семинар-погружение для юристов",
    fullDesc:
      "Живой семинар с демонстрацией AI-инструментов в реальном времени.\n\n" +
      "✅ Полный день интенсивной практики\n" +
      "✅ Демонстрация работы нейросетей на реальных кейсах\n" +
      "✅ Ответы на вопросы в живом формате\n" +
      "✅ Нетворкинг с коллегами-юристами\n" +
      "✅ Кофе-брейки включены\n\n" +
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
      "✅ 2 дня интенсивной практики\n" +
      "✅ Работа на вашем ноутбуке\n" +
      "✅ Настройка AI-инструментов вместе\n" +
      "✅ Решаете свои реальные кейсы с AI\n" +
      "✅ Нетворкинг с коллегами\n" +
      "✅ Обед и кофе-брейки включены\n\n" +
      "<b>Площадка:</b> Bubble, Саратов",
  },
  {
    id: "automation",
    name: "Автоматизация юрфирмы",
    icon: "🤖",
    shortDesc: "Аудит + внедрение AI-инструментов в вашу практику",
    fullDesc:
      "Индивидуальный проект автоматизации для вашей юр. фирмы.\n\n" +
      "✅ Аудит текущих процессов\n" +
      "✅ Подбор AI-инструментов\n" +
      "✅ Настройка и интеграция\n" +
      "✅ Обучение сотрудников\n" +
      "✅ Поддержка 3 месяца\n\n" +
      "<b>Стоимость:</b> от 200 000 ₽ (зависит от масштаба задачи)",
  },
  {
    id: "corporate",
    name: "Корпоративное обучение",
    icon: "🏛",
    shortDesc: "Программа обучения для команды юристов",
    fullDesc:
      "Корпоративная программа обучения AI для юридических команд.\n\n" +
      "✅ Адаптация программы под компанию\n" +
      "✅ Обучение от 5 до 100 человек\n" +
      "✅ Выделенный куратор\n" +
      "✅ Отчёты о прогрессе\n" +
      "✅ Корпоративная лицензия на промпты\n\n" +
      "<b>Формат:</b> онлайн или выезд в офис",
  },
  {
    id: "services",
    name: "Услуги команды",
    icon: "⚡",
    shortDesc: "Разработка AI-решений на заказ",
    fullDesc:
      "Индивидуальная разработка AI-решений для юридического бизнеса.\n\n" +
      "✅ Разработка кастомных промптов\n" +
      "✅ Интеграция с вашими системами\n" +
      "✅ Создание AI-ботов и ассистентов\n" +
      "✅ Аналитика и отчётность\n" +
      "✅ Техническая поддержка\n\n" +
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
- Помогать выбрать тариф (Базовый 45 000₽, Премиум 75 000₽, VIP 120 000₽)
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
  const name = esc(ctx.from?.first_name) || "друг";

  const welcomeText =
    `Добро пожаловать, <b>${name}</b>! 👋\n\n` +
    `──────────────────────────\n\n` +
    `🏛 <b>AI Legal Academy</b>\n` +
    `<i>Первая в России школа AI для юристов</i>\n\n` +
    `──────────────────────────\n\n` +
    `Мы учим юристов работать с нейросетями и автоматизировать рутину:\n\n` +
    `📄 Анализ договоров за <b>5 минут</b> вместо 3 часов\n` +
    `⚖️ Генерация исков и правовых позиций\n` +
    `🔍 Due Diligence с помощью AI\n` +
    `🎨 Legal Design без дизайнера\n` +
    `📊 Маркетинг и контент для юриста\n\n` +
    `──────────────────────────\n\n` +
    `Нажмите кнопку ниже, чтобы получить <b>бесплатный гайд</b> с 5 промптами для юристов — или выберите раздел в меню 👇`;

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
      `Введите ваше <b>имя</b>:`,
    { parse_mode: "HTML" }
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
    `📝 <b>Заявка: ${product ? product.name : productId}</b>\n\nВведите ваше <b>имя</b>:`,
    { parse_mode: "HTML" }
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
    `│             │ Базовый  │ Премиум  │   VIP    │\n` +
    `├─────────────┼──────────┼──────────┼──────────┤\n` +
    `│ Цена        │ 45 000   │ 75 000   │ 150 000  │\n` +
    `│ Платформа   │ 3 мес.   │ 3 мес.   │ 6 мес.   │\n` +
    `│ AI-сервисы  │    ✕     │ 3 мес.   │ 6 мес.   │\n` +
    `│ Промпты     │   15     │   50+    │   50+    │\n` +
    `│ Д/з проверка│    ✕     │    ✓     │    ✓     │\n` +
    `│ Мастермайнды│    ✕     │    ✓     │    ✓     │\n` +
    `│ Консультации│    ✕     │    ✕     │    ✓     │\n` +
    `│ Аудит фирмы │    ✕     │    ✕     │    ✓     │\n` +
    `│ Сертификат  │    ✕     │    ✓     │    ✓     │\n` +
    `│ Сайт в 🎁   │    ✕     │    ✓     │    ✓     │\n` +
    `│ Поддержка   │  общая   │  общая   │  24/7    │\n` +
    `└─────────────┴──────────┴──────────┴──────────┘` +
    `</pre>`;

  const kb = new InlineKeyboard()
    .text("📦 Базовый", "apply_tariff_basic")
    .text("⭐ Премиум", "apply_tariff_premium")
    .text("💎 VIP", "apply_tariff_vip")
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
    `📝 <b>Заявка на тариф «${tariffName}»</b>\n\nВведите ваше <b>имя</b>:`,
    { parse_mode: "HTML" }
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
      `Введите ваше <b>имя</b>:`,
    { parse_mode: "HTML" }
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
      `/help — Эта справка\n\n` +
      `──────────────────────────\n\n` +
      `Также вы можете использовать кнопки меню внизу экрана.`,
    { parse_mode: "HTML", reply_markup: mainKeyboard() }
  );
});

// ─────────────────────────────────────────────────────────────
// MANYASHA AI — Keyboard button handler
// ─────────────────────────────────────────────────────────────

bot.hears("🪆 Спросить Маняшу", async (ctx) => {
  ctx.session.step = "manyasha_chat";
  ctx.session.chatHistory = [];
  await ctx.reply(
    `🪆 <b>Маняша слушает!</b>\n\n` +
      `Привет! Я Маняша — твой AI-помощник по курсу "Нейросети для юристов" 🎓\n\n` +
      `Задай мне любой вопрос о курсе, программе, тарифах или экспертах.\n\n` +
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

  const userCount = getUserCount();
  const activeToday = getActiveToday();

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

  const userCount = getUserCount();
  const activeToday = getActiveToday();

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

  const chatIds = getAllChatIds();
  let sent = 0;
  let failed = 0;

  for (const chatId of chatIds) {
    try {
      await bot.api.sendMessage(chatId, text, { parse_mode: "HTML" });
      sent++;
    } catch (e) {
      failed++;
    }
  }

  await ctx.reply(
    `📤 <b>Рассылка завершена</b>\n\n` +
      `✅ Доставлено: ${sent}\n` +
      `❌ Ошибки: ${failed}\n` +
      `📊 Всего: ${chatIds.length}`,
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
        .text("📦 Базовый", "select_basic")
        .row()
        .text("⭐ Премиум", "select_premium")
        .row()
        .text("💎 VIP", "select_vip");
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

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────

await setBotCommands();

bot.start({
  onStart: (info) => {
    console.log(`\n🤖 Bot @${info.username} started successfully`);
    console.log(`   Site: ${SITE_URL}`);
    console.log(`   API:  ${API_URL}`);
    console.log(`   Admin: ${ADMIN_CHAT_ID ? "configured" : "not set"}\n`);
  },
});
