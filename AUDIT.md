# Аудит безопасности и качества — AI Legal Academy

> Дата: 2026-06-11. Метод: мульти-агентное ревью (6 направлений) с состязательной верификацией каждой находки.
> Итог: 41 находка → **36 подтверждено** (1 critical, 12 medium, 19 low, 4 info), 5 отклонено как ложные.

## Приоритетный план

### 🔴 Срочно (компрометация / потеря данных)
1. **Ротировать `BOT_TOKEN` (BotFather) и `ADMIN_PASSWORD`** — засветились, считать утёкшими. `chmod 600` на `bot/.env`.
2. **Бэкап БД** (`pg_dump ailegal` по cron + выгрузка вовне) и **ротация логов PM2** (`pm2-logrotate`) — иначе риск безвозвратной потери ПДн и заполнения диска общего сервера.

### 🟠 Главная дыра (на этой неделе)
3. **Разделить секреты**: отдельный `BOT_SHARED_SECRET` для бот↔сайт и для `telegram/confirm`; веб-админку перевести на серверные сессии + `User.role` (модель уже есть). Закрывает CRITICAL и несколько medium/low.
4. **Атомарный claim рассылки** (`updateMany where status='pending'`) + ретраи/троттлинг/reaper в боте — чтобы рассылки не дублировались и не терялись.

### 🟡 Бизнес-корректность и устойчивость (ближайший спринт)
5. Подсчёт мест только по релевантным статусам + дедуп лидов по телефону — влияет на конверсию.
6. Лимит тела запроса + ранний отказ по длине массива в чате + rate-limit на LLM в боте — DoS и денежный абуз.
7. Fail-fast у бота при отсутствии env, обработчики `unhandledRejection`, фикс `SITE_URL`, подтверждение `pm2 save/startup`.
8. Мелочи: единый источник дат + TZ, обработка ошибок на клиенте, ужесточение CSP, валидация email.

---

## CRITICAL
- **Единый `ADMIN_PASSWORD` на админку + бота + Telegram-вход → захват аккаунтов.** `src/lib/admin.ts:7-12`, `src/app/api/auth/telegram/confirm/route.ts:13-18`, `src/app/admin/page.tsx:78,84,97,106,126`. Секрет уходит в браузер (sessionStorage); его утечка даёт дамп всех PII И подделку `telegram/confirm` (вход под любым пользователем). → Развести секреты, сессионная админка по `role`.

## MEDIUM
- `/api/admin/users` отдаёт весь PII по shared-секрету — `src/app/api/admin/users/route.ts:24-39`.
- Живые секреты в plaintext в `bot/.env` — `bot/.env:1,6`. Ротировать, chmod 600.
- DoS в чате: валидация массива до ограничения длины — `src/app/api/chat/route.ts:52-79`.
- Рассылка застревает в `sending` без ретрая — `bot/index.js:1394-1437`.
- `/broadcast` без троттлинга → 429/пропуски — `bot/index.js:1144-1164`.
- Маняша-fallback дёргает платный LLM без rate-limit — `bot/index.js:1200-1213`.
- Гонка двойной отправки: claim не атомарен — `src/app/api/bot/broadcasts/route.ts:18-29`.
- Подсчёт мест считает ВСЕ лиды (rejected/спам/дубли) — `src/app/api/spots/route.ts:28-29`.
- Нет дедупа лидов / уникальности по телефону — `prisma/schema.prisma:10-26`.
- Бот падает при старте без `bot/.env` — `bot/index.js:16`.
- Нет ротации логов PM2 — `ecosystem.config.cjs:15-46`.
- Нет бэкапов БД — `docker-compose.yml:1-31`.

## LOW
- scrypt с дефолтным N=16384 — `src/lib/auth.ts:16-19`.
- Telegram-confirm: код без привязки к браузеру — `src/app/api/auth/telegram/confirm/route.ts:33-69`.
- Гонка в status: consumedAt после создания сессии — `src/app/api/auth/telegram/status/route.ts:43-53`.
- User enumeration при регистрации — `src/app/api/auth/register/route.ts:40-43`.
- Сессии без ротации/инвалидации, TTL 30 дней — `src/lib/auth.ts:33-50`.
- `/api/leads` GET без select/лимита — `src/app/api/leads/route.ts:142-146`.
- `/api/bot/broadcasts` доступен извне, тот же секрет — `src/app/api/bot/broadcasts/route.ts:11-13,41-44`.
- Нет лимита тела запроса (DoS) — `chat:49`, `tts:44`, `leads:26`.
- `x-real-ip` доверяется безусловно — `src/lib/rate-limit.ts:115-117`.
- CSP с `unsafe-inline`/`unsafe-eval` — `next.config.ts:12`.
- Нет обработчиков unhandledRejection/uncaughtException — `bot/index.js:1378-1382,1439`.
- Даты без TZ — `src/components/CountdownTimer.tsx:17`.
- Дедлайн захардкожен мимо единого источника — `src/components/Bonus.tsx:77`.
- Тихое проглатывание ошибок fetch на клиенте — `src/components/Hero.tsx:28-35`.
- SITE_URL fallback на ailegal.ru — `bot/index.js:28` (на сервере уже исправлено на expertum.pro).
- Слабый пароль БД в docker-compose в git — `docker-compose.yml:8`.
- Forward-only миграции без отката — `ecosystem.config.cjs:10-11`.
- max_memory_restart не задан боту; 600M вебу тесно — `ecosystem.config.cjs:24`.
- Переживание ребута зависит от ручного pm2 save — `ecosystem.config.cjs:12-13` (на сервере подтверждено: pm2-root enabled).

## INFO
- Email лида не валидируется при сохранении — `src/app/api/leads/route.ts:53`.
- Один секрет на авторизацию сайта и очередь рассылок — `bot/index.js:521-524,561,...`.
- Honeypot возвращает `id:'ok'` (string), фронт ждёт number — `src/app/api/leads/route.ts:30-33`.
- `output:"standalone"` несовместим с `next start` — `next.config.ts:41`.
