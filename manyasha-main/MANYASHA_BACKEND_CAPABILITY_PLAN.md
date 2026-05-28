# Capability-модель бэкенда для Маняши

## Цель

Перестроить backend вокруг возможностей Маняши без удаления существующего кода. Текущие маршруты и сервисы должны остаться рабочими, а новая модель должна наслаиваться поверх уже существующих API в [`app.py`](app.py), [`partner_dashboard.py`](partner_dashboard.py) и [`mascot_talk_service.py`](mascot_talk_service.py).

## Почему это нужно

Сейчас Маняша в проекте в основном представлена как:
- чат-ответчик через [`/api/manyasha/chat`](app.py:168),
- partner assistant через [`/api/v1/partner/mascot/talk`](partner_dashboard.py:864),
- визуальный runtime через [`/api/v1/partner/mascot/runtime`](partner_dashboard.py:854),
- набор UI-модулей в [`frontend/src/components/MascotConversation.tsx`](frontend/src/components/MascotConversation.tsx), [`frontend/src/components/MascotStage.tsx`](frontend/src/components/MascotStage.tsx) и [`frontend/src/lib/MascotController.ts`](frontend/src/lib/MascotController.ts).

Это хорошая основа, но пока backend организован вокруг технических сущностей: upload, prompt, analytics, rpg. Для главного экспонента проекта нужно перейти к модели, где главным объектом является сама Маняша и её возможности.

## Принцип новой архитектуры

Backend должен отвечать на 5 вопросов:

1. Что Маняша знает.
2. Что Маняша помнит.
3. Что Маняша умеет делать.
4. Где границы её полномочий.
5. Как она адаптируется под партнёра и маршрут пользователя.

## Capability-модель Маняши

### 1. Knowledge Capabilities — что Маняша знает

Это слой контекста и знаний.

Маняша должна знать:
- кто текущий партнёр;
- какой активен prompt и его версия;
- какой runtime-режим используется;
- какие доступны действия на текущем маршруте;
- текущий RPG-уровень и score;
- безопасный case context без ПДн;
- историю текущего диалога;
- ограничения домена и guardrails.

Текущая база уже частично есть в [`MascotTalkContext`](mascot_talk_service.py:27) и [`PromptBuilder`](PromptBuilder.ts:74), но это нужно оформить как отдельный capability layer.

Целевой backend-объект:
- `ManyashaContextSnapshot`

Пример состава:
- `partner_id`
- `route`
- `runtime`
- `prompt_profile`
- `rpg_state`
- `case_context`
- `history_summary`
- `allowed_actions`
- `safety_profile`

### 2. Memory Capabilities — что Маняша помнит

Маняша не должна быть одноразовым генератором ответа. Она должна помнить:
- текущую сессию;
- последние сообщения;
- summary предыдущего диалога;
- уже предложенные действия;
- выполненные пользователем шаги;
- последнюю понятую задачу пользователя.

Минимальный первый слой памяти:
- conversation session id;
- history summary;
- last recommended action;
- active journey stage.

Целевые backend-сущности:
- `ManyashaSession`
- `ManyashaMemoryState`
- `ManyashaMessageRecord`

Это должно естественно лечь поверх будущих таблиц диалогов из [`postgresql_rls_schema.sql`](postgresql_rls_schema.sql).

### 3. Action Capabilities — что Маняша умеет делать

Маняша должна не только отвечать, но и инициировать действия.

Уже есть хороший задел в [`MascotTalkActionPlan`](mascot_talk_service.py:13), но actions пока в основном навигационные.

Нужно расширить capability-модель действий до 4 уровней:

#### 3.1 Навигационные действия
- открыть раздел;
- предложить следующий экран;
- объяснить, зачем перейти в раздел.

#### 3.2 Операционные действия
- запросить статус runtime;
- запросить аналитику;
- показать состояние prompt;
- показать рекомендуемые RPG-настройки.

#### 3.3 Ассистивные действия
- предложить следующий шаг;
- объяснить ошибку;
- сформировать краткий план действий;
- подсветить, что отсутствует в настройке.

#### 3.4 Оркестрационные действия
- инициировать workflow;
- перевести пользователя на следующий этап;
- напомнить о незавершённом шаге;
- сопровождать сценарий onboarding / upload / tuning.

Целевой backend-объект:
- `ManyashaActionDescriptor`

Поля:
- `kind`
- `target`
- `label`
- `description`
- `capability`
- `requires_confirmation`
- `allowed_roles`
- `execution_mode`

### 4. Authority Capabilities — где границы полномочий Маняши

Нужно чётко разделить, что Маняша:
- может объяснять;
- может рекомендовать;
- может инициировать;
- не может обещать;
- не может делать без явного подтверждения;
- не может говорить вне разрешённого домена.

Полномочия надо выразить в backend через policy layer.

Целевые понятия:
- `allowed_capabilities`
- `forbidden_claims`
- `confirmation_required_capabilities`
- `role_bound_capabilities`

Примеры:
- Маняша может предложить открыть аналитику.
- Маняша может объяснить статус маскота.
- Маняша не может давать юридическую гарантию результата дела.
- Маняша не может выполнять рискованные действия без подтверждения.

### 5. Persona Capabilities — как Маняша адаптируется

Маняша как главный экспонент должна быть адаптивной.

Она должна уметь менять:
- стиль общения;
- длину ответа;
- степень дружелюбия;
- уровень формальности;
- сценарий навигации;
- визуальный и голосовой режим.

Это не просто prompt. Это backend-профиль персонажа.

Целевой backend-объект:
- `ManyashaPersonaProfile`

Поля:
- `persona_id`
- `partner_id`
- `tone`
- `verbosity`
- `formality`
- `safety_mode`
- `voice_profile`
- `animation_profile`
- `response_style_rules`

## Минимальная безопасная точка входа в текущем проекте

Самый безопасный первый шаг — не ломать текущие endpoint-ы, а добавить новый orchestration-слой между [`post_partner_mascot_talk()`](partner_dashboard.py:864) и [`MascotTalkService`](mascot_talk_service.py:286).

### Почему именно здесь

Потому что именно [`post_partner_mascot_talk()`](partner_dashboard.py:864):
- уже собирает runtime;
- уже знает route;
- уже знает историю;
- уже знает RPG state;
- уже знает partner prompt;
- уже стримит ответ в UI [`frontend/src/components/MascotConversation.tsx`](frontend/src/components/MascotConversation.tsx).

Это идеальная точка, чтобы начать capability-переход без удаления старой логики.

## Первый безопасный шаг реализации

### Шаг 1. Ввести новый backend-модуль capability orchestration

Рекомендуемый новый файл:
- `manyasha_capabilities.py`

Что в нём должно появиться сначала:
- dataclass для capability snapshot;
- dataclass для persona profile;
- dataclass для session memory state;
- dataclass для expanded action descriptor;
- service `ManyashaCapabilityService`.

### Шаг 2. Сервис должен собирать capability snapshot

Первый сервисный метод:
- `build_snapshot(...)`

Он должен принимать то, что уже есть в [`post_partner_mascot_talk()`](partner_dashboard.py:864), и возвращать единый объект состояния Маняши.

### Шаг 3. Не удалять [`MascotTalkService`](mascot_talk_service.py:286), а завернуть его

То есть новая логика должна выглядеть так:
- endpoint собирает данные;
- `ManyashaCapabilityService` строит capability snapshot;
- snapshot превращается в orchestration plan;
- затем existing [`MascotTalkService.build_stream_plan()`](mascot_talk_service.py:308) использует этот enriched context.

### Шаг 4. UI пока не ломать

Текущий UI в [`frontend/src/components/MascotConversation.tsx`](frontend/src/components/MascotConversation.tsx) уже умеет:
- принимать stream;
- выводить actions;
- показывать provider и prompt version.

Поэтому на первом этапе лучше расширять payload SSE, а не переписывать фронт с нуля.

## Что должно измениться у Маняши после первого этапа

После первого этапа Маняша должна стать лучше даже без тотального рефактора:

- лучше понимать маршрут пользователя;
- отдавать не только ответ, но и capability-aware actions;
- иметь формализованный persona profile;
- иметь session memory state хотя бы на уровне модели;
- быть подготовленной к переходу от «чата» к orchestrator assistant.

## Что делать после первого этапа

### Этап 2
- persistent session storage;
- history summary storage;
- action execution log;
- richer route-aware recommendations.

### Этап 3
- tool execution layer;
- role-aware permissions;
- journey orchestration engine;
- session continuation между экранами.

### Этап 4
- partner-specific persona management;
- voice and animation policies;
- explainability layer;
- trust/audit layer.

## Что нельзя делать при переходе

Нельзя:
- удалять текущие endpoint-ы;
- ломать [`/api/v1/partner/mascot/talk`](partner_dashboard.py:864);
- ломать [`/api/manyasha/chat`](app.py:168) до появления единой migration strategy;
- смешивать capability layer с низкоуровневой storage-логикой в одном месте;
- тащить ПДн в conversation context.

## Практический вывод

Для этого проекта правильный путь — не переписывать всё сразу, а постепенно превратить Маняшу из talking mascot в capability-driven product assistant.

Первая безопасная точка входа уже есть: [`post_partner_mascot_talk()`](partner_dashboard.py:864). Через неё можно начать перестройку backend без удаления существующего кода и без поломки текущего UX.