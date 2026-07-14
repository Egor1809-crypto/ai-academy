// ═══════════════════════════════════════════════════════════════
// ЕДИНЫЙ ИСТОЧНИК ДАННЫХ — AI Legal Academy
// ═══════════════════════════════════════════════════════════════
// Все данные для сайта, бота и Маняши берутся ТОЛЬКО отсюда.
// Изменил здесь — изменилось везде.
// ═══════════════════════════════════════════════════════════════

// ── Общие настройки ──────────────────────────────────────────

export const SITE = {
  // Бренд / коммерческое обозначение курса (для маркетинга и UI)
  name: "AI Legal",
  fullName: "AI Legal Academy",
  // Оператор персональных данных / исполнитель по оферте (юрлицо)
  operator: "ООО «АСПБ»",
  operatorFull:
    "Общество с ограниченной ответственностью «АСПБ» (Агентство сопровождения процедур банкротства)",
  domain: "expertum.pro",
  url: "https://expertum.pro",
  telegramBot: "https://t.me/ailegal_academy_bot",
  email: "bankrotstvo-partner@yandex.ru",
  phone: "+7 929 653-33-40",
  address: "410012, Саратовская область, г. Саратов, ул. Московская, д. 117б, помещ. 12",
  city: "Саратов",
  inn: "6452098049",
  kpp: "645001001",
  ogrn: "1126450005406",
  director: "Лисенкова Юлия Валерьевна",
  regDate: "10.04.2012",
  // Единый идентификатор версии юридических документов (A7). Хранится в согласии
  // лида (policy_version) и в cookie-согласии — однозначно сопоставляет
  // зафиксированное согласие с опубликованным текстом (бремя доказывания, ч.1 ст.9).
  // При правке текста документов — поднимать legalVersion И обновлять legalRevision.
  legalVersion: "1.0",
  // Дата редакции юридических документов (политика, оферта, согласия)
  legalRevision: "11.06.2026",
  copyright: `AI Legal ${new Date().getFullYear()}`,
  socials: {
    telegram: "https://t.me/ailegal_academy",
    vk: "https://vk.com/ailegal",
  },
} as const;

// ── Курс ─────────────────────────────────────────────────────

export const COURSE = {
  title: "ИИ для юриста по банкротству (БФЛ)",
  startDate: "15 Июля 2026",
  startDateISO: "2026-07-15T00:00:00",
  offerDeadline: "2026-08-15T00:00:00",
  totalSpots: 100,
  duration: "8 недель",
  practicalTasks: "40+",
  modules: 8,
  speakers: 5,
  graduates: "500+",
  recommendRate: "98%",
  rating: "9.2/10",
  hoursPerMonthSaved: 40,
  returnGuaranteeDays: 7,
  installmentMonths: 12,
  taxDeduction: "13%",
} as const;

// ── Тарифы ───────────────────────────────────────────────────

export interface Tariff {
  id: string;
  name: string;
  desc: string;
  price: number;
  priceFormatted: string;
  monthly: string;
  features: string[];
  popular: boolean;
  bonus?: string;
  tag: string;
  emoji: string;
  taxDeductible?: boolean;
}

export const TARIFFS: Tariff[] = [
  {
    id: "start",
    name: "Старт",
    desc: "Собрать базу самому: 8 уроков в записи и обзор банкротства.",
    price: 9900,
    priceFormatted: "9 900",
    monthly: "от 825",
    features: [
      "8 уроков в записи + обновления",
      "Обзорный модуль по банкротству",
      "Чат поддержки потока",
      "Сертификат Expertum × АСПБ",
    ],
    popular: false,
    tag: "start",
    emoji: "⚡",
  },
  {
    id: "praktik",
    name: "Практик",
    desc: "Ядро курса: живые разборы дел, шаблоны БФЛ и комьюнити практиков.",
    price: 24900,
    priceFormatted: "24 900",
    monthly: "от 2 075",
    features: [
      "Всё из тарифа «Старт»",
      "Библиотека промптов и шаблонов БФЛ",
      "Живые практикумы и разборы дел (5–6)",
      "Блок «Этика, тайна, безопасность»",
      "Выпускной кейс + закрытое комьюнити",
      "Удостоверение о ПК + вычет 13%",
    ],
    popular: true,
    bonus: "Живые эксперты-практики, а не записи",
    tag: "praktik",
    emoji: "★",
    taxDeductible: true,
  },
  {
    id: "vnedrenie",
    name: "Внедрение",
    desc: "Система под ключ в вашу фирму: свой стек, регламент и 1:1.",
    price: 49900,
    priceFormatted: "49 900",
    monthly: "от 4 158",
    features: [
      "Всё из тарифа «Практик»",
      "Модуль «Свой стек»: MCP, парсер КАД, TG-бот",
      "Регламент использования ИИ в фирме",
      "1:1 сессия внедрения и разбор дела",
      "RAG-база по вашим делам",
    ],
    popular: false,
    tag: "vnedrenie",
    emoji: "◆",
    taxDeductible: true,
  },
];

// ── Эксперты ─────────────────────────────────────────────────

export interface Expert {
  name: string;
  role: string;
  desc: string;
  shortDesc: string;
  initials: string;
  photo: string;
  emoji: string;
  isFounder: boolean;
  metrics?: { value: string; label: string }[];
}

export const EXPERTS: Expert[] = [
  {
    name: "Дмитрий Сизов",
    role: "Основатель AI Legal · Управляющий партнёр",
    desc: "Руководитель команды арбитражных управляющих. Интегрировал AI-системы в работу 50+ юридических компаний. Автор методологии «AI-First Legal Practice».",
    shortDesc: "Создатель курса и методологии внедрения AI в юридическую практику. Руководит стратегическим развитием проекта.",
    initials: "ДС",
    photo: "/experts/sizov-v2.jpg",
    emoji: "👨‍💼",
    isFounder: true,
    metrics: [
      { value: "50+", label: "AI-интеграций" },
      { value: "15+", label: "Лет в юриспруденции" },
    ],
  },
  {
    name: "Владислав Галкин",
    role: "Директор по AI-дизайну",
    desc: "Создаёт визуальные стратегии для юридического маркетинга с помощью Midjourney и Runway. Обучил 300+ юристов Legal Design.",
    shortDesc: "Специалист по нейросетям для визуального контента. Legal Design, Midjourney, генерация маркетинговых материалов.",
    initials: "ВГ",
    photo: "/experts/galkin.jpg",
    emoji: "🎨",
    isFounder: false,
  },
  {
    name: "Василий Артин",
    role: "Юрист-консультант",
    desc: "Архитектор AI-решений для судебной практики. Разработал 200+ специализированных промптов для анализа договоров и подготовки исков.",
    shortDesc: "Консультант по AI-решениям для анализа договоров и генерации юридических документов.",
    initials: "ВА",
    photo: "/experts/artin.jpg",
    emoji: "🧠",
    isFounder: false,
  },
  {
    name: "Дмитрий Путин",
    role: "Эксперт по AI-автоматизации",
    desc: "Специалист по внедрению нейросетей в корпоративные юридические процессы. Сократил время обработки документов в 5 раз для крупных юрфирм.",
    shortDesc: "Автоматизация юридических бизнес-процессов. Интеграция AI-решений в существующие workflow.",
    initials: "ДП",
    photo: "/experts/putin.jpg",
    emoji: "🤖",
    isFounder: false,
  },
  {
    name: "Егор Шабалин",
    role: "AI-стратег · Технический директор",
    desc: "Выстраивает AI-инфраструктуру для юридических команд. Эксперт по интеграции ChatGPT, Claude и кастомных LLM-решений.",
    shortDesc: "Архитектура AI-решений для юридического бизнеса. Внедрение и масштабирование AI-инструментов.",
    initials: "ЕШ",
    photo: "/experts/shabalin.jpg",
    emoji: "📐",
    isFounder: false,
  },
];

// ── Продукты ─────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  shortName: string;
  tag: string;
  tagColor: string;
  shortDesc: string;
  fullDesc: string;
  price: string;
  priceNote?: string;
  href: string;
  emoji: string;
  format: string;
  location?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "course",
    name: 'ИИ для юриста по банкротству (БФЛ)',
    shortName: "AI-Курс для юристов",
    tag: "ОНЛАЙН",
    tagColor: "bg-gold/20 text-gold border-gold/30",
    shortDesc: "8-недельный онлайн-курс с практикой и поддержкой",
    fullDesc:
      "Первая в России система ИИ для юриста по банкротству (БФЛ).\n\n" +
      "✅ 8 уроков БФЛ, Урок 6 — практикум по банкротству\n" +
      "✅ Реестр, отзывы, жалобы, оспаривание сделок 61.2–61.9\n" +
      "✅ Работа с Claude, GPT, Gemini + российский стек\n" +
      "✅ Шаблоны и промпты под задачи БФЛ\n" +
      "✅ Комьюнити и сопровождение до внедрения",
    price: "от 9 900 ₽",
    href: "/tariffs",
    emoji: "🎓",
    format: "Онлайн",
  },
  {
    id: "seminar",
    name: 'Живой семинар "AI-революция"',
    shortName: "Живой семинар",
    tag: "ОФФЛАЙН",
    tagColor: "bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30",
    shortDesc: "Однодневный семинар-погружение для юристов",
    fullDesc:
      "Живой семинар с демонстрацией AI-инструментов в реальном времени.\n\n" +
      "✅ Полный день интенсивной практики\n" +
      "✅ Демонстрация работы нейросетей на реальных кейсах\n" +
      "✅ Ответы на вопросы в живом формате\n" +
      "✅ Нетворкинг с коллегами-юристами\n" +
      "✅ Кофе-брейки включены",
    price: "от 15 000 ₽",
    href: "/products/seminar",
    emoji: "🎤",
    format: "Очно",
    location: "Bubble, Саратов",
  },
  {
    id: "workshop",
    name: 'Практикум "AI-Lab"',
    shortName: "Очный практикум",
    tag: "HANDS-ON",
    tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    shortDesc: "Двухдневный воркшоп в малых группах",
    fullDesc:
      "Практикум с погружением в AI-инструменты под руководством экспертов.\n\n" +
      "✅ 2 дня интенсивной практики\n" +
      "✅ Работа на вашем ноутбуке\n" +
      "✅ Настройка AI-инструментов вместе\n" +
      "✅ Решаете свои реальные кейсы с AI\n" +
      "✅ Нетворкинг с коллегами\n" +
      "✅ Обед и кофе-брейки включены",
    price: "от 35 000 ₽",
    href: "/products/workshop",
    emoji: "🏢",
    format: "Очно, 2 дня",
    location: "Bubble, Саратов",
  },
  {
    id: "automation",
    name: "Автоматизация юрфирмы",
    shortName: "Автоматизация бизнеса",
    tag: "B2B",
    tagColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    shortDesc: "Аудит + внедрение AI-инструментов в вашу юридическую практику",
    fullDesc:
      "Индивидуальный проект автоматизации для вашей юр. фирмы.\n\n" +
      "✅ Аудит текущих процессов\n" +
      "✅ Подбор AI-инструментов\n" +
      "✅ Настройка и интеграция\n" +
      "✅ Обучение сотрудников\n" +
      "✅ Поддержка 3 месяца",
    price: "от 200 000 ₽",
    priceNote: "Стоимость зависит от масштаба задачи — обсудим на консультации",
    href: "/products/automation",
    emoji: "🤖",
    format: "Индивидуально",
  },
  {
    id: "corporate",
    name: "Корпоративное обучение",
    shortName: "Корпоративное обучение",
    tag: "TEAM",
    tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    shortDesc: "Программа обучения для команды юристов от 5 человек",
    fullDesc:
      "Корпоративная программа обучения AI для юридических команд.\n\n" +
      "✅ Адаптация программы под компанию\n" +
      "✅ Обучение от 5 до 100 человек\n" +
      "✅ Выделенный куратор\n" +
      "✅ Отчёты о прогрессе\n" +
      "✅ Корпоративная лицензия на промпты",
    price: "индивидуально",
    href: "/products/corporate",
    emoji: "🏛",
    format: "Онлайн или выезд в офис",
  },
  {
    id: "services",
    name: "Услуги команды",
    shortName: "Услуги команды",
    tag: "СЕРВИС",
    tagColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    shortDesc: "Разработка AI-решений на заказ для юридического бизнеса",
    fullDesc:
      "Индивидуальная разработка AI-решений для юридического бизнеса.\n\n" +
      "✅ Разработка кастомных промптов\n" +
      "✅ Интеграция с вашими системами\n" +
      "✅ Создание AI-ботов и ассистентов\n" +
      "✅ Аналитика и отчётность\n" +
      "✅ Техническая поддержка",
    price: "от 50 000 ₽",
    href: "/products/services",
    emoji: "⚡",
    format: "На заказ",
  },
];

// ── Тикер ────────────────────────────────────────────────────

export const TICKER_ITEMS = [
  "Практикум по банкротству",
  "Реестр · отзывы · жалобы за минуты",
  "Оспаривание сделок 61.2–61.9",
  "8 уроков до внедрения",
  "Работа по 152-ФЗ",
  "Удостоверение о ПК + вычет 13%",
  `Гарантия возврата ${COURSE.returnGuaranteeDays} дней`,
  "Рассрочка 0%",
];

// ── Trust Badges ─────────────────────────────────────────────

// Курс ещё не запущен — показываем ПРОВЕРЯЕМЫЕ характеристики программы, а не
// выдуманные метрики достижений (выпускники/рейтинг/рекомендации): ст.5 ФЗ «О рекламе»
// требует достоверности, недоказуемые цифры — прямой риск, особенно для юр-аудитории.
export const TRUST_METRICS = [
  { value: `${COURSE.modules}`, label: "Уроков" },
  { value: COURSE.practicalTasks, label: "Шаблонов БФЛ" },
  { value: "152-ФЗ", label: "Приватность данных" },
  { value: `${COURSE.returnGuaranteeDays} дней`, label: "Гарантия возврата" },
];

export const AI_TOOLS = [
  "ChatGPT",
  "Claude",
  "Midjourney",
  "Gemini",
  "Perplexity",
  "Runway",
  "YandexGPT",
];

// ── Hero счётчики ────────────────────────────────────────────

export const HERO_COUNTERS = [
  { end: 500, suffix: "+", label: "Выпускников" },
  { end: COURSE.hoursPerMonthSaved, suffix: "ч", label: "Экономия в мес." },
  { end: 98, suffix: "%", label: "Рекомендуют" },
  { end: COURSE.speakers, suffix: "", label: "Спикеров" },
];

// ── Venue (площадка) ─────────────────────────────────────────

export const VENUE = {
  name: "Bubble",
  city: "Саратов",
  photo: "/venues/bubble-saratov.jpg",
  tagline: "Инновации · Партнёрство · Развитие",
};

// ── Манифест ────────────────────────────────────────────────

export const MANIFESTO = {
  headline: "Адаптируйся. Или уступи.",
  subheadline: "Юридический рынок не ждёт тех, кто стоит на месте",
  peterQuote: {
    text: "Я предчувствую, что россияне когда-нибудь, а может быть при жизни нашей, пристыдят самые просвещённые народы успехами своими в науках, неутомимостью в трудах и величеством твёрдой и громкой славы.",
    author: "Пётр I",
    note: "Указ об обучении, 1714 год",
  },
  stats: [
    { value: "78%", label: "юрфирм в мире уже используют AI", source: "Thomson Reuters, 2025" },
    { value: "10x", label: "ускорение анализа документов с AI", source: "McKinsey Legal Tech" },
    { value: "44%", label: "юридических задач автоматизируются к 2027", source: "Goldman Sachs" },
    { value: "3.5 трлн ₽", label: "рынок LegalTech в России к 2028", source: "РБК" },
  ],
  triggers: [
    "Ваши конкуренты уже учатся. Каждый день без AI — потерянные клиенты.",
    "Юристы с AI зарабатывают в 2-3 раза больше — потому что делают в 10 раз быстрее.",
    "Через год рынок разделится на тех, кто освоил AI, и тех, кто ищет работу.",
  ],
} as const;

// ── Калькулятор экономии ────────────────────────────────────

export const CALC = {
  avgHourlyRate: 3000, // средняя ставка юриста ₽/час
  aiSpeedMultiplier: 10, // во сколько раз быстрее с AI
  workWeeksPerYear: 48,
  tasks: [
    { name: "Анализ договоров", hoursPerWeek: 6, aiReduction: 0.85 },
    { name: "Судебная практика", hoursPerWeek: 4, aiReduction: 0.80 },
    { name: "Составление документов", hoursPerWeek: 5, aiReduction: 0.70 },
    { name: "Исследования и аналитика", hoursPerWeek: 3, aiReduction: 0.75 },
    { name: "Рутинная переписка", hoursPerWeek: 2, aiReduction: 0.90 },
  ],
} as const;

// ── Промпт Маняши (для сайта и бота) ────────────────────────

function buildManyashaPrompt(platform: "site" | "telegram"): string {
  const tariffList = TARIFFS.map(
    (t) => `${t.name} ${t.priceFormatted} ₽`
  ).join(", ");

  const expertList = EXPERTS.filter((e) => !e.isFounder)
    .map((e) => `${e.name} (${e.role})`)
    .join(", ");

  const productList = PRODUCTS.map((p) => p.name).join(", ");

  const base = `Ты — Маняша, милый AI-помощник курса "${COURSE.title}" (${SITE.fullName}).
Ты выглядишь как матрёшка в стиле гжель (сине-белая роспись) и держишь книжку "Федеральный закон №127".

Твоя задача — помогать ${platform === "site" ? "посетителям сайта" : "пользователям в Telegram"}:
- Отвечать на вопросы о курсе
- Рассказывать о программе обучения (${COURSE.modules} модуля, ${COURSE.duration})
- Помогать выбрать тариф (${tariffList})
- Объяснять, как AI помогает юристам

Информация о курсе:
- Курс "${COURSE.title}" — практический курс от экспертов-юристов
- ${COURSE.graduates} выпускников, ${COURSE.recommendRate} рекомендуют, ${COURSE.speakers} спикеров
- Экономия до ${COURSE.hoursPerMonthSaved} часов в месяц
- Старт ближайшего потока: ${COURSE.startDate}
- Основатель: Дмитрий Сизов
- Эксперты: ${expertList}
- Продукты: ${productList}
- Сайт: ${SITE.url}

Правила:
- Отвечай коротко и дружелюбно (2-4 предложения)
- Используй эмодзи умеренно
- Говори на русском языке
- Если не знаешь ответ, предложи ${platform === "site" ? "посетить соответствующую страницу" : "подходящую команду бота или посетить сайт"}
- Не придумывай информацию, которой нет в контексте`;

  if (platform === "telegram") {
    return (
      base +
      `\n\nКоманды бота (подсказывай пользователям):
- /products — Продукты и услуги
- /tariffs — Тарифы курса
- /program — Программа обучения
- /experts — Наши эксперты
- /apply — Оставить заявку
- /faq — Частые вопросы
- Если пользователь хочет записаться, предложи команду /apply`
    );
  }

  return (
    base +
    `\n\nСтраницы сайта:
- /about — О курсе
- /program — Программа обучения
- /experts — Наши эксперты
- /tariffs — Тарифы и цены
- /products — Продукты и услуги`
  );
}

export const MANYASHA_PROMPT_SITE = buildManyashaPrompt("site");
export const MANYASHA_PROMPT_TELEGRAM = buildManyashaPrompt("telegram");
