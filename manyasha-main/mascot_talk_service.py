from __future__ import annotations

from dataclasses import dataclass
import json
import os
from typing import Any, Iterable, Protocol
from urllib import error as urllib_error
from urllib import request as urllib_request
from uuid import UUID


@dataclass(slots=True)
class MascotTalkActionPlan:
    kind: str
    label: str
    target: str
    description: str | None = None


@dataclass(slots=True)
class MascotTalkHistoryItem:
    role: str
    content: str


@dataclass(slots=True)
class MascotTalkContext:
    partner_id: UUID
    message: str
    current_route: str
    history: list[MascotTalkHistoryItem]
    case_context: dict[str, Any]
    runtime_mode: str
    runtime_status: str
    level: str
    weighted_score: int
    partner_prompt_text: str | None = None
    partner_prompt_version: int | None = None


@dataclass(slots=True)
class MascotTalkPlan:
    provider_prompt: str
    actions: list[MascotTalkActionPlan]
    reply_text: str
    provider_name: str


@dataclass(slots=True)
class MascotTalkStreamPlan:
    provider_prompt: str
    actions: list[MascotTalkActionPlan]
    provider_name: str
    prompt_version: int | None
    token_stream: Iterable[str]


class MascotTalkProvider(Protocol):
    def build_reply(self, context: MascotTalkContext, actions: list[MascotTalkActionPlan], provider_prompt: str) -> str:
        ...

    def stream_reply(self, context: MascotTalkContext, actions: list[MascotTalkActionPlan], provider_prompt: str) -> Iterable[str]:
        ...


class RuleBasedMascotTalkProvider:
    name = "rule-based"

    def build_reply(self, context: MascotTalkContext, actions: list[MascotTalkActionPlan], provider_prompt: str) -> str:
        lowered = context.message.lower()
        runtime_label = {
            "uploaded-model": "Подключён реальный 3D-ассет партнёра.",
            "sprite2d": "Сейчас работает 2D sprite fallback партнёра.",
            "placeholder3d": "Пока работает demo-плейсхолдер, поэтому визуальный образ ещё можно улучшить.",
        }.get(context.runtime_mode, "Runtime маскота активен.")

        style_prefix = self.build_style_prefix(context.partner_prompt_text)

        if "статус" in lowered or "где посмотреть" in lowered:
            return (
                f"{style_prefix}Статус кабинета и ключевые показатели удобнее всего смотреть в аналитике. "
                f"Текущий уровень партнёра: {context.level}, weighted score: {context.weighted_score}. {runtime_label} "
                "Сначала откройте аналитику, затем при необходимости вернитесь к маскоту или RPG-настройкам."
            )

        if "документ" in lowered or "загруз" in lowered or "ассет" in lowered or "маскот" in lowered:
            return (
                f"{style_prefix}Для загрузки визуального ассета идите в раздел маскота. "
                f"Там уже работает upload/runtime pipeline, и после загрузки новый asset автоматически заменит текущий режим. {runtime_label} "
                "После этого проверьте prompt и затем аналитику, чтобы поведение кабинета оставалось согласованным."
            )

        if "rpg" in lowered or "уров" in lowered or "вес" in lowered:
            return (
                f"{style_prefix}RPG-раздел управляет весами XP, QI, SP и RP. "
                f"Сейчас уровень партнёра: {context.level}, weighted score: {context.weighted_score}. "
                "Если хотите изменить характер ассистента, сначала настройте RPG-веса, а затем уточните prompt и визуальное поведение маскота."
            )

        if "промпт" in lowered or "инструкц" in lowered:
            prompt_suffix = (
                f" Сейчас активна версия prompt v{context.partner_prompt_version}."
                if context.partner_prompt_version is not None
                else ""
            )
            return (
                f"{style_prefix}Партнёрский prompt лучше редактировать в разделе маскота рядом с загрузкой ассета."
                f"{prompt_suffix} Сначала сформулируйте стиль и ограничения ответа, затем проверьте, как это влияет на аналитику и дальнейший диалог."
            )

        return (
            f"{style_prefix}Я могу помочь с тремя базовыми задачами: проверить статус кабинета, настроить визуальный asset маскота и скорректировать RPG-параметры партнёра. "
            f"Сейчас вы на маршруте {context.current_route}. {runtime_label} Сформулируйте запрос точнее, и я подскажу следующий шаг по платформе."
        )

    def build_style_prefix(self, partner_prompt_text: str | None) -> str:
        if not partner_prompt_text:
            return ""

        lowered = partner_prompt_text.lower()
        if "коротко" in lowered or "кратко" in lowered:
            return "Коротко: "
        if "дружелюб" in lowered or "тепл" in lowered:
            return "Дружелюбно поясню: "
        if "строго" in lowered or "формально" in lowered:
            return "Формально: "
        return ""

    def stream_reply(self, context: MascotTalkContext, actions: list[MascotTalkActionPlan], provider_prompt: str) -> Iterable[str]:
        reply = self.build_reply(context, actions, provider_prompt)
        for token in reply.split(" "):
            if token:
                yield token + " "


class OpenAICompatibleMascotTalkProvider:
    def __init__(self, base_url: str, model: str, api_key: str | None = None, timeout_seconds: float = 20.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.name = f"openai-compatible:{self.model}"

    _SYSTEM = (
        "Ты — Маняша, AI-ассистент партнёрского кабинета платформы. "
        "Отвечай ТОЛЬКО на русском языке, кратко (3-4 предложения), без юридических гарантий. "
        "Обратись тепло (солнышко / зайка / дорогой — каждый раз разное). "
        "Веди пользователя к конкретному следующему шагу в интерфейсе. "
        "В каждом ответе обязательно выдели одну ключевую мысль markdown-жирным: **...** (один фрагмент за ответ). "
        "Никакого китайского или других языков."
    )

    def build_reply(self, context: MascotTalkContext, actions: list[MascotTalkActionPlan], provider_prompt: str) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self._SYSTEM},
                {"role": "user", "content": provider_prompt},
            ],
            "temperature": 0.5,
            "max_tokens": 280,
            "stream": False,
        }
        parsed = self._post_chat_completions(payload)
        return self._extract_content(parsed)

    def stream_reply(self, context: MascotTalkContext, actions: list[MascotTalkActionPlan], provider_prompt: str) -> Iterable[str]:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self._SYSTEM},
                {"role": "user", "content": provider_prompt},
            ],
            "temperature": 0.5,
            "max_tokens": 280,
            "stream": True,
        }
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        request = urllib_request.Request(
            url=f"{self.base_url}/chat/completions",
            data=body,
            headers=headers,
            method="POST",
        )

        try:
            with urllib_request.urlopen(request, timeout=self.timeout_seconds) as response:
                for raw_line in response:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line or not line.startswith("data:"):
                        continue
                    payload_line = line[5:].strip()
                    if not payload_line or payload_line == "[DONE]":
                        continue
                    parsed = json.loads(payload_line)
                    choices = parsed.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    token = delta.get("content")
                    if token:
                        yield str(token)
        except urllib_error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"LLM provider вернул HTTP {exc.code}: {detail}") from exc
        except urllib_error.URLError as exc:
            raise RuntimeError(f"LLM provider недоступен: {exc.reason}") from exc

    def _post_chat_completions(self, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        request = urllib_request.Request(
            url=f"{self.base_url}/chat/completions",
            data=body,
            headers=headers,
            method="POST",
        )

        try:
            with urllib_request.urlopen(request, timeout=self.timeout_seconds) as response:
                raw_payload = response.read().decode("utf-8")
        except urllib_error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"LLM provider вернул HTTP {exc.code}: {detail}") from exc
        except urllib_error.URLError as exc:
            raise RuntimeError(f"LLM provider недоступен: {exc.reason}") from exc

        return json.loads(raw_payload)

    def _extract_content(self, parsed: dict[str, Any]) -> str:
        choices = parsed.get("choices") or []
        if not choices:
            raise RuntimeError("LLM provider не вернул choices в ответе chat/completions.")

        message = choices[0].get("message") or {}
        content = str(message.get("content") or "").strip()
        if not content:
            raise RuntimeError("LLM provider вернул пустой content.")
        return content


def build_default_provider() -> MascotTalkProvider:
    provider_kind = os.getenv("MANAYA_MASCOT_TALK_PROVIDER", "rule-based").strip().lower()
    if provider_kind in {"", "rule-based", "local"}:
        return RuleBasedMascotTalkProvider()

    if provider_kind in {"openai-compatible", "openai", "llm"}:
        base_url = os.getenv("MANAYA_LLM_BASE_URL", "").strip()
        model = os.getenv("MANAYA_LLM_MODEL", "").strip()
        api_key = os.getenv("MANAYA_LLM_API_KEY", "").strip() or None
        if not base_url or not model:
            return RuleBasedMascotTalkProvider()
        timeout_seconds = float(os.getenv("MANAYA_LLM_TIMEOUT_SECONDS", "20"))
        return OpenAICompatibleMascotTalkProvider(
            base_url=base_url,
            model=model,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
        )

    return RuleBasedMascotTalkProvider()


class MascotTalkService:
    def __init__(self, provider: MascotTalkProvider | None = None) -> None:
        self.provider = provider or build_default_provider()
        self.fallback_provider = RuleBasedMascotTalkProvider()

    def build_plan(self, context: MascotTalkContext) -> MascotTalkPlan:
        actions = self.build_actions(context.current_route)
        provider_prompt = self.build_provider_prompt(context, actions)
        provider_name = getattr(self.provider, "name", self.provider.__class__.__name__)
        try:
            reply_text = self.provider.build_reply(context, actions, provider_prompt)
        except Exception:
            fallback_name = getattr(self.fallback_provider, "name", self.fallback_provider.__class__.__name__)
            reply_text = self.fallback_provider.build_reply(context, actions, provider_prompt)
            provider_name = f"{provider_name}->fallback:{fallback_name}"
        return MascotTalkPlan(
            provider_prompt=provider_prompt,
            actions=actions,
            reply_text=reply_text,
            provider_name=provider_name,
        )

    def build_stream_plan(self, context: MascotTalkContext) -> MascotTalkStreamPlan:
        actions = self.build_actions(context.current_route)
        provider_prompt = self.build_provider_prompt(context, actions)
        primary_name = getattr(self.provider, "name", self.provider.__class__.__name__)
        fallback_name = getattr(self.fallback_provider, "name", self.fallback_provider.__class__.__name__)

        plan = MascotTalkStreamPlan(
            provider_prompt=provider_prompt,
            actions=actions,
            provider_name=primary_name,
            prompt_version=context.partner_prompt_version,
            token_stream=(),
        )

        def token_stream() -> Iterable[str]:
            try:
                yield from self.provider.stream_reply(context, actions, provider_prompt)
                return
            except Exception:
                plan.provider_name = f"{primary_name}->fallback:{fallback_name}"
                yield from self.fallback_provider.stream_reply(context, actions, provider_prompt)

        plan.token_stream = token_stream()
        return plan

    def build_actions(self, current_route: str) -> list[MascotTalkActionPlan]:
        normalized_route = current_route.strip() or "/partner/mascot"
        base = [
            MascotTalkActionPlan(
                kind="navigate",
                label="Открыть раздел маскота",
                target="/partner/mascot",
                description="Здесь загружается ассет, меняется prompt и проверяется runtime персонажа.",
            ),
            MascotTalkActionPlan(
                kind="navigate",
                label="Открыть RPG-настройки",
                target="/partner/rpg",
                description="В разделе RPG меняются веса XP, QI, SP и RP для поведения партнёрского режима.",
            ),
            MascotTalkActionPlan(
                kind="navigate",
                label="Открыть аналитику",
                target="/partner/analytics",
                description="Там виден текущий уровень, события и штрафы по партнёру.",
            ),
        ]
        if normalized_route == "/partner/rpg":
            return [base[1], base[2], base[0]]
        if normalized_route == "/partner/analytics":
            return [base[2], base[1], base[0]]
        return base

    def build_provider_prompt(self, context: MascotTalkContext, actions: list[MascotTalkActionPlan]) -> str:
        history_block = "\n".join(
            f"- {item.role}: {item.content.strip()}" for item in context.history[-8:] if item.content.strip()
        ) or "- history is empty"
        actions_block = "\n".join(
            f"- {action.label}: {action.target}" for action in actions
        )
        case_keys = ", ".join(sorted(context.case_context.keys())) or "none"
        partner_prompt = context.partner_prompt_text or "not configured"

        return (
            "<context>\n"
            f"<route>{context.current_route}</route>\n"
            f"<runtime mode=\"{context.runtime_mode}\" status=\"{context.runtime_status}\" />\n"
            f"<rpg level=\"{context.level}\" weighted_score=\"{context.weighted_score}\" />\n"
            f"<partner_prompt version=\"{context.partner_prompt_version or 0}\">{partner_prompt}</partner_prompt>\n"
            f"<case_context_keys>{case_keys}</case_context_keys>\n\n"
            "<history>\n"
            f"{history_block}\n"
            "</history>\n\n"
            "<available_actions>\n"
            f"{actions_block}\n"
            "</available_actions>\n\n"
            f"<user_message>{context.message}</user_message>"
        )