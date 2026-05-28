// ═══════════════════════════════════════════════════════════════
// ЕДИНЫЙ ИСТОЧНИК ДАННЫХ — AI Legal Academy
// ═══════════════════════════════════════════════════════════════
// Все данные для сайта, бота и Маняши берутся ТОЛЬКО отсюда.
// Изменил здесь — изменилось везде.
// ═══════════════════════════════════════════════════════════════

// ── Общие настройки ──────────────────────────────────────────

export const SITE = {
  name: "AI Legal",
  fullName: "AI Legal Academy",
  domain: "ailegal.ru",
  url: "https://ailegal.ru",
  telegramBot: "https://t.me/ailegal_academy_bot",
  email: "hello@ailegal.ru",
  phone: "+7 (495) 123-45-67",
  address: "Москва, Пресненская наб. 12",
  inn: "7703123456",
  ogrn: "1234567890123",
  copyright: `AI Legal ${new Date().getFullYear()}`,
  socials: {
    telegram: "https://t.me/ailegal_academy",
    vk: "https://vk.com/ailegal",
  },
} as const;

// ── Курс ─────────────────────────────────────────────────────

export const COURSE = {
  title: "Нейросети для юристов",
  startDate: "15 Июля 2026",
  startDateISO: "2026-07-15T00:00:00",
  offerDeadline: "2026-08-15T00:00:00",
  totalSpots: 100,
  duration: "8 недель",
  practicalTasks: "40+",
  modules: 4,
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
}

export const TARIFFS: Tariff[] = [
  {
    id: "basic",
    name: "Базовый",
    desc: "Основы работы с AI для ежедневных задач юриста.",
    price: 45000,
    priceFormatted: "45 000",
    monthly: "от 3 750",
    features: [
      "Все основные модули программы",
      "Доступ к платформе на 3 месяца",
      "Общий чат участников",
      "15 готовых промптов для юристов",
    ],
    popular: false,
    tag: "basic",
    emoji: "📦",
  },
  {
    id: "premium",
    name: "Премиум",
    desc: "Полное погружение + готовые инструменты.",
    price: 75000,
    priceFormatted: "75 000",
    monthly: "от 6 250",
    features: [
      "Всё из Базового тарифа",
      "Доступ к AI-сервисам на 3 месяца",
      "Проверка домашних заданий",
      "Закрытые мастермайнды",
      "50+ продвинутых промптов",
      "Сертификат о прохождении",
    ],
    popular: true,
    bonus: "В подарок — готовый сайт для юриста",
    tag: "premium",
    emoji: "⭐",
  },
  {
    id: "vip",
    name: "VIP",
    desc: "Индивидуальная работа и внедрение AI в компанию.",
    price: 120000,
    priceFormatted: "120 000",
    monthly: "от 10 000",
    features: [
      "Всё из тарифа Премиум",
      "Индивидуальные консультации с куратором",
      "Аудит процессов вашей юр. фирмы",
      "Доступ к AI-сервисам на 6 месяцев",
      "Персональный план внедрения AI",
      "Приоритетная поддержка 24/7",
    ],
    popular: false,
    tag: "vip",
    emoji: "💎",
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
    photo: "/experts/sizov.jpg",
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
    role: "AI-консультант",
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
    name: 'AI-Курс "Нейросети для юристов"',
    shortName: "AI-Курс для юристов",
    tag: "ОНЛАЙН",
    tagColor: "bg-gold/20 text-gold border-gold/30",
    shortDesc: "8-недельный онлайн-курс с практикой и поддержкой",
    fullDesc:
      "Комплексный курс по внедрению нейросетей в юридическую практику.\n\n" +
      "✅ 4 модуля, 8 недель обучения\n" +
      "✅ 40+ практических заданий\n" +
      "✅ Работа с ChatGPT, Claude, Midjourney\n" +
      "✅ Промпты для юристов\n" +
      "✅ Чат с поддержкой и однокурсниками",
    price: "от 45 000 ₽",
    href: "/tariffs",
    emoji: "🎓",
    format: "Онлайн",
  },
  {
    id: "seminar",
    name: 'Живой семинар "AI-революция"',
    shortName: "Живой семинар",
    tag: "ОФФЛАЙН",
    tagColor: "bg-cyber-purple/20 text-cyber-purple border-cyber-purple/30",
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

// ── Программа курса ──────────────────────────────────────────

export interface Module {
  number: number;
  title: string;
  duration: string;
  topics: string[];
  tools: string[];
}

export const PROGRAM: Module[] = [
  {
    number: 1,
    title: "Введение в нейросети для юристов",
    duration: "2 недели",
    topics: [
      "Как работают LLM: ChatGPT, Claude, Gemini",
      "Настройка рабочего окружения",
      "Основы промпт-инженерии для юристов",
      "Обезличивание данных и адвокатская тайна",
    ],
    tools: ["ChatGPT", "Claude", "YandexGPT"],
  },
  {
    number: 2,
    title: "AI в судебно-претензионной работе",
    duration: "2 недели",
    topics: [
      "Анализ судебной практики через AI",
      "Генерация исковых заявлений",
      "Подготовка правовых позиций",
      "Работа с базами судебных решений",
    ],
    tools: ["ChatGPT", "Claude", "Perplexity"],
  },
  {
    number: 3,
    title: "Договорная работа и комплаенс",
    duration: "2 недели",
    topics: [
      "AI-анализ договоров за 5 минут",
      "Due diligence и проверка контрагентов",
      "Автоматизация compliance-процедур",
      "Создание шаблонов и чек-листов",
    ],
    tools: ["ChatGPT", "Claude", "Gemini"],
  },
  {
    number: 4,
    title: "Маркетинг и визуал для юриста",
    duration: "2 недели",
    topics: [
      "Legal Design с помощью AI",
      "Контент для соцсетей и блога",
      "Презентации и визуальные материалы",
      "Построение личного бренда юриста",
    ],
    tools: ["Midjourney", "Runway", "ChatGPT"],
  },
];

// ── FAQ ──────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ: FAQItem[] = [
  {
    question: "Нужно ли уметь программировать?",
    answer: "Нет! Мы учим работать с AI на естественном языке — никакого кода. Все инструменты осваиваются через интерфейс на примерах из реальной юридической практики.",
  },
  {
    question: "Безопасно ли загружать документы в AI?",
    answer: "На курсе целый блок посвящён обезличиванию данных и работе с Enterprise-версиями нейросетей. Разбираем как сохранить адвокатскую тайну и соблюсти 152-ФЗ.",
  },
  {
    question: "Подойдёт ли студентам юрфака?",
    answer: "Да! Освоив AI ещё в учёбе, вы получите огромное конкурентное преимущество на рынке труда. Задачи курса доступны уровню junior+.",
  },
  {
    question: "Какие нейросети будем изучать?",
    answer: "ChatGPT (GPT-4), Claude, Midjourney, YandexGPT, Gemini, Perplexity. Также разбираем GigaChat для работы с документами, содержащими гостайну.",
  },
  {
    question: "Будет ли доступ к материалам после окончания?",
    answer: "Да — от 3 до 6 месяцев в зависимости от тарифа. База промптов обновляется, и вы получаете обновления в течение всего периода доступа.",
  },
  {
    question: "Есть рассрочка?",
    answer: `Да, рассрочка на ${COURSE.installmentMonths} месяцев без переплат. Также возврат ${COURSE.taxDeduction} через налоговый вычет на образование.`,
  },
  {
    question: "Есть гарантия возврата?",
    answer: `100% возврат средств в первые ${COURSE.returnGuaranteeDays} дней, если курс не подойдёт. Без вопросов и бюрократии.`,
  },
  {
    question: "Подойдёт ли курс для корпоративного обучения?",
    answer: "Да! Корпоративное обучение от 5 человек с адаптацией программы под вашу компанию. Отдельный куратор, отчёты о прогрессе.",
  },
];

// ── Отзывы ───────────────────────────────────────────────────

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  metric: string;
  text: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Иван Соколов",
    role: "Корпоративный юрист",
    company: "KELIN Group",
    metric: "В 36 раз быстрее",
    text: "Раньше анализ сложного договора занимал 2-3 часа. Теперь с помощью AI — 5 минут. За первую неделю после курса окупил его стоимость.",
  },
  {
    name: "Елена Маркова",
    role: "Адвокат",
    company: 'Адвокатское бюро "Правый берег"',
    metric: "Legal Design за 2 недели",
    text: "Благодаря модулю по Midjourney полностью переделала визуалы для клиентских презентаций. Клиенты в восторге, конверсия выросла.",
  },
  {
    name: "Алексей Русаков",
    role: "Руководитель юр. департамента",
    company: "ТехноПром",
    metric: "Продуктивность x3",
    text: "Внедрили AI-инструменты в отдел из 12 человек. Производительность выросла втрое, при этом качество документов улучшилось.",
  },
  {
    name: "Дмитрий Козлов",
    role: "Арбитражный управляющий",
    company: "Независимая практика",
    metric: "40 часов/мес экономии",
    text: "Как арбитражный управляющий работаю с огромными объёмами данных. AI-инструменты из курса сэкономили мне 40+ часов ежемесячно.",
  },
];

// ── Тикер ────────────────────────────────────────────────────

export const TICKER_ITEMS = [
  `${COURSE.graduates} Выпускников`,
  `${COURSE.hoursPerMonthSaved} часов экономии в месяц`,
  "50+ Готовых промптов",
  "Доступ к AI-сервисам",
  "Практика на реальных кейсах",
  `Гарантия возврата ${COURSE.returnGuaranteeDays} дней`,
  "Рассрочка 0%",
];

// ── Trust Badges ─────────────────────────────────────────────

export const TRUST_METRICS = [
  { value: COURSE.graduates, label: "Выпускников" },
  { value: COURSE.recommendRate, label: "Рекомендуют" },
  { value: COURSE.rating, label: "Рейтинг курса" },
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
