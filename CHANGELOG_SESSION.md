# Список изменений сессии — AI Legal Academy (expertum.pro)

Дата: 2026-07-03. Ветка: `full-upgrade-phase1-5` → `main` → прод `72.56.38.62:/var/www/ai-academy`.
Все пункты задеплоены и проверены на https://expertum.pro.

---

## 1. Баги и фиксы
| Что | Где (файл) |
|---|---|
| Счётчик в «Бонусе» выходил за рамку на мобиле | `src/components/CountdownTimer.tsx`, `src/components/Bonus.tsx` |
| Маняша — чёрный квадрат (Safari не тянет VP9-WebM) → детект кодека + статичный фолбэк | `src/hooks/useAlphaVideoFallback.ts`, `src/components/Manyasha.tsx`, `src/components/ManyashaChat.tsx`, `public/mascot/manyasha-idle-fallback.webp` |
| Полоска слайдера отставала от ползунка (убран transition) | `src/components/TimeSavingsCalc.tsx` |
| Страницы «доезжали» снизу вверх (убран глобальный `scroll-smooth`) | `src/app/layout.tsx` |
| Навбар ломался на 768–1100px (десктоп-меню `md:`→`xl:`, бургер до 1280) | `src/components/Navbar.tsx` |
| Продукты: стрелки не в линию + слабая иерархия + нет компонента | `src/components/ProductCard.tsx` (новый), `src/app/products/page.tsx` |
| Таймеры Маняши (hover/nav) не очищались на unmount → навигация-хайджек | `src/components/Manyasha.tsx` |
| Чат Маняши переполнял экран на мобиле (нет клампа ширины) | `src/components/ManyashaChat.tsx` |

## 2. Адаптив и типографика
| Что | Где |
|---|---|
| Мобайл-адаптив отступов секций (`py-28`→`py-14 sm:py-20 md:py-28`) и карточек (`p-8`→`p-5 md:p-8`), 11 секций + 12 карточек | `src/components/*` |
| Hero «Профессия юриста» в 2 строки; eyebrow «Почему сейчас» белым+крупнее | `src/components/WhyNow.tsx` |
| Манифест: убраны точки; «Манифест» белым+крупнее | `src/components/Manifesto.tsx` |
| Секционные eyebrow-заголовки → стиль «Целевая аудитория»; убраны мелкие лейблы карточек | `Audience.tsx`, `Tariffs.tsx`, `Testimonials.tsx`, `UseCases.tsx`, `TrustBadges.tsx` |
| Инструменты (CHATGPT/CLAUDE…) ярче и крупнее (×2) | `UseCases.tsx`, `TrustBadges.tsx` |
| Кабинет — единый шрифт (Space Grotesk, убран `font-mono`) | `src/app/cabinet/page.tsx` |
| Контраст серого текста до WCAG AA (gray-600/500 → gray-400) | `LiveDemo.tsx`, `Commands.tsx` |
| `prefers-reduced-motion` (вестибулярная безопасность) | `src/app/globals.css`, `src/components/ScrollReveal.tsx` |

## 3. Cookie-баннер
| Что | Где |
|---|---|
| Компактный → премиальный «Досье» стиль (HUD-уголки, serif, иконка-щит, эффекты) | `src/components/CookieConsent.tsx` |
| Гранулярные категории «Настроить» (Необходимые/Аналитика/Маркетинг) + фиксация выбора | `src/components/CookieConsent.tsx` |
| A11y: `role=dialog+aria-live` (не модалка) → `role=region` | `src/components/CookieConsent.tsx` |

## 4. Новые фичи (по разбору конкурентов)
| Что | Где |
|---|---|
| **Живое демо AI-юриста** — секция + demo-режим промпта (реально решает задачу) | `src/components/LiveDemo.tsx` (новый), `src/app/api/chat/route.ts`, `src/app/page.tsx` |
| **Карточки «готовые команды»** — 8 сценариев, клик → авто-запрос в демо (`demo:ask`) | `src/components/Commands.tsx` (новый), `src/app/page.tsx` |
| **Блок «Безопасность данных / 152-ФЗ»** | `src/components/DataSecurity.tsx` (новый), `src/app/page.tsx` |

## 5. Авторизация и 152/149-ФЗ
| Что | Где |
|---|---|
| Аудит: иностранных OAuth НЕТ (Google/Apple/Telegram-виджет отсутствуют) | — (вывод аудита) |
| `/api/auth/register` отключён (410) — создавал аккаунты без согласия на ПДн | `src/app/api/auth/register/route.ts` |
| Журнал попыток входа (IP + хеш email, не plaintext) | `src/app/api/auth/login/route.ts` |
| **HIGH:** кабинет отдавал ЧУЖИЕ заявки при совпадении email/phone → ключ по `userId` | `src/app/cabinet/page.tsx` |
| Клавиатурная доступность триггера маскота (role/tabindex/keydown/aria) | `src/components/Manyasha.tsx` |
| **Яндекс ID** — ⏳ ждёт Client ID/Secret от пользователя (флоу опишем) | — |

## 6. Фото и контент
| Что | Где |
|---|---|
| Новое фото Дмитрия Сизова (cache-bust: `sizov.jpg`→`sizov-v2.jpg`) | `public/experts/sizov-v2.jpg`, `src/data/content.ts` |
| Реквизиты ООО «АСПБ», домен expertum.pro (152-ФЗ пакет — до сессии) | `src/data/content.ts` |
| ⏳ Фото Шабалина — отложено (текущее — плейсхолдер) | `public/experts/shabalin.jpg` |

## 7. Бот (Telegram)
| Что | Где |
|---|---|
| Переписано приветствие (живой тон, без divider-спама); `✅`-буллеты продуктов → `•` | `bot/index.js` |

## 8. Документы (в репозитории)
- `TZ_AILEGAL.md` — ТЗ по 13 пунктам + авторизация.
- `COMPETITORS_RESEARCH.md` — разбор конкурентов + стратегия (месседж, БФЛ).
- `CHANGELOG_SESSION.md` — этот файл.

## 9. Инфраструктура/проверки
- Health-check всей платформы: 21 страница `200`, AI-чат/TTS живые, эндпоинты/гейты корректны.
- Ультракод-ревью (28 агентов): 11 подтверждённых дефектов — все исправлены; ложные отсеяны.
- Каждый пакет: TSC + локальный build + preview/DOM-проверка + деплой.

## 10. Цепочка коммитов (main)
`605ed9d` счётчик+фото Сизова → `83d5bc2` cache-bust фото → `76ddfdd` фолбэк маскота+cookie →
`fb12705` навбар+адаптив → `18a4a1c` премиум cookie → `7c34bf8` Пакет A → `b1d2172` ProductCard+cookie ФЗ →
`394c06c` бот/кабинет/auth → `f257425` живое демо → `f098dd5` команды/безопасность+11 фиксов ревью.

## Осталось (ждёт тебя)
- **Яндекс ID**: Client ID/Secret + redirect URI `https://expertum.pro/api/auth/yandex/callback`.
- **Фото Шабалина** (#8), **почта на домен** (#7 — отложено).
- **Стратегия на согласование**: месседж «агенты/результат», БФЛ-трек (детали в `COMPETITORS_RESEARCH.md`).
- **Кабинет `Мои заявки`**: теперь показывает только заявки с `Lead.userId` — при выдаче доступа их нужно линковать к аккаунту (иначе список пуст; это цена устранения утечки ПДн).
- `/code-review ultra` на ветке (запускаешь ты) — облачный разбор поверх.
