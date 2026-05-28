# Manyasha Dev Stands

Документ фиксирует актуальные локальные dev-стенды Маняши. Оба стенда рассчитаны на локальную проверку и требуют запущенные frontend/backend процессы.

## Общие требования

- Frontend dev server: `http://127.0.0.1:5174`
- Backend dev server: `http://127.0.0.1:8000`
- Backend health: `http://127.0.0.1:8000/healthz` должен вернуть `{"status":"ok"}`
- Реальные секреты, install tokens и production env значения в эти URL не добавлять.

## Smoke Checklist

Перед ручной проверкой любого стенда:

1. Frontend `5174` запущен.
2. Backend `8000` запущен.
3. Страница стенда открывается без browser/network ошибок.
4. Виджет открывается.
5. `install-health` показывает `ok/widget_ready`, если стенд использует embed flow.
6. Сообщение отправляется и приходит ответ Маняши.
7. На узком viewport нет page-level horizontal overflow.

## Stand 1: Bankruptcy Preview

Name: `Bankruptcy preview`

Purpose: основной dev/demo preview виджета Маняши на банкротной странице. Используется для проверки full widget runtime, normal mode, demo mode, voice/TTS, анимаций и диагностического flow.

URL:

```text
http://127.0.0.1:5174/mascot-design-preview.html?api_origin=http://127.0.0.1:8000&embed_contract_version=1&instance=bankruptcy-dev
```

Instance: `bankruptcy-dev`

Type: direct preview page / dev-demo shell.

Requires backend 8000: yes.

What to verify:

- Normal-mode starter questions visible.
- Normal-mode responses use backend chat API.
- Voice/TTS works only after user action; no spontaneous TTS.
- Mute/unmute works without page reload.
- Animations/state machine remain stable: idle, thinking, speaking/book states.
- Diagnostics route card appears after enough user messages.
- Client report and copy/email UI behave safely.
- Manual consult CTA and modal work.
- 320px/mobile layout has no horizontal overflow.

Failure signs:

- `Не удалось связаться с Маняшей` or backend connection error.
- Starter questions missing in normal mode.
- Demo prepared answers appearing without explicit `demo_mode=1`.
- Browser `speechSynthesis` fallback returning.
- Voice starts on page load/idle.
- Diagnostic card/report overflows on mobile.
- Horizontal page scroll appears around 320px.

## Stand 2: Letaibe / AI Media Lab Portable Embed

Name: `Letaibe / AI Media Lab portable embed`

Purpose: external host-site style dev stand that proves Manyasha can be embedded into another website through the portable script flow. This is not a copy of a real site; it is a local media-like host page for checking iframe isolation and portability.

URL:

```text
http://127.0.0.1:5174/embed-letaibe-dev.html?api_origin=http://127.0.0.1:8000&embed_contract_version=1&instance=letaibe-dev&widget_preview=1
```

Instance: `letaibe-dev`

Type: external host-site + portable embed script + clean iframe widget shell.

Requires backend 8000: yes.

What to verify:

- Host page layout loads normally and is not affected by widget CSS.
- Widget launcher appears cleanly.
- Opening launcher creates iframe with clean `widget.html` shell.
- Iframe does not contain preview/landing content from `mascot-design-preview.html`.
- `demo_mode` is not enabled accidentally.
- `install-health` reaches `ok/widget_ready`.
- Drag is stable on desktop: no shaking, jumping, resize feedback loop or accidental close/open.
- Internal close button closes parent iframe and returns launcher.
- No extra external close button appears above the widget.
- Host page scroll works normally.
- Mobile 390px has no horizontal overflow; input/send/mic/close remain accessible.

Failure signs:

- Iframe shows preview/landing text such as `Egor Банкротит`, `Запросить разбор`, or preview page layout.
- External close button appears above the widget in addition to the internal close button.
- Drag causes shaking, jumping, iframe resize loops, or accidental close/open.
- Closing the widget does not return launcher.
- Widget CSS changes host page typography/layout.
- Host page gets horizontal scroll at 390px.
- `install-health` stays `booting` or returns error while backend is healthy.

Known low:

- On mobile 390px, horizontal drag of the opened widget is naturally limited by viewport because the widget nearly fills the available width. This is expected if close/input/send/mic remain accessible and no overflow appears.
