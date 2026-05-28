from __future__ import annotations

from datetime import datetime, timedelta, timezone
from time import perf_counter, sleep

from fastapi.testclient import TestClient

import app as api_app


class _DummySession:
    pass


def test_manyasha_chat_returns_fast_fallback_when_llm_is_slow(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 3.8)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "ollama")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "")

    def _slow_ollama(_messages, timeout_seconds=None):
        sleep(8.0)
        return None

    monkeypatch.setattr(api_app, "_ollama_chat_complete", _slow_ollama)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", lambda *_args, **_kwargs: None)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-timeout",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            started = perf_counter()
            response = client.post(
                "/api/manyasha/chat",
                json={
                    "message": "привет что делать если у меня 2.000.000 долгов и приставы списывают деньги",
                    "history": [],
                },
            )
            elapsed = perf_counter() - started
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)

    assert response.status_code == 200
    assert 3.0 <= elapsed <= 6.0

    payload = response.json()
    reply = str(payload.get("reply") or "")
    speech_reply = str(payload.get("speech_reply") or "")

    assert reply
    assert speech_reply
    assert "2 000 000" in reply
    assert "уточните" in reply.lower() or "следующий шаг" in reply.lower()
    assert "гарантирую" not in reply.lower()
    assert 80 <= len(speech_reply) <= 280
    assert "гарантирую" not in speech_reply.lower()
    assert "[" not in speech_reply and "]" not in speech_reply and "*" not in speech_reply


def test_manyasha_chat_fallback_is_intent_aware_for_different_questions(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 3.2)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "ollama")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "")

    def _slow_ollama(_messages, timeout_seconds=None):
        sleep(6.0)
        return None

    monkeypatch.setattr(api_app, "_ollama_chat_complete", _slow_ollama)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", lambda *_args, **_kwargs: None)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-timeout-intents",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    scenarios = [
        ("Что ты умеешь?", ("помога", "банкрот", "долг")),
        ("У меня 2 миллиона долгов, что делать?", ("2 000 000", "доход", "имуществ", "исполнитель")),
        ("Чем МФЦ отличается от суда?", ("мфц", "суд")),
        ("Приставы списывают деньги, что делать?", ("пристав", "исполнитель", "удержан")),
        ("Какие документы нужны для банкротства?", ("документ", "паспорт", "доход")),
        ("Можно ли сохранить квартиру?", ("квартир", "ипотек", "имуществ")),
        ("Сколько длится банкротство?", ("срок", "этап")),
        ("Мне звонят коллекторы, что делать?", ("коллект", "требован", "пристав")),
    ]

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            replies: list[str] = []
            speech_replies: list[str] = []
            for q, keywords in scenarios:
                started = perf_counter()
                response = client.post(
                    "/api/manyasha/chat",
                    json={"message": q, "history": []},
                )
                elapsed = perf_counter() - started
                assert response.status_code == 200
                assert 3.0 <= elapsed <= 6.0
                payload = response.json()
                reply = str(payload.get("reply") or "").strip()
                speech_reply = str(payload.get("speech_reply") or "").strip()
                assert reply
                assert speech_reply
                reply_lc = reply.lower()
                speech_lc = speech_reply.lower()
                assert any(token in reply_lc for token in keywords), (q, reply)
                assert any(token in speech_lc for token in keywords), (q, speech_reply)
                if "что ты умеешь" in q.lower():
                    assert "банкротство можно рассмотреть" not in reply_lc
                replies.append(reply)
                speech_replies.append(speech_reply)
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)

    assert len(set(replies)) == len(scenarios)
    assert len(set(speech_replies)) == len(scenarios)
    opening_phrases = [r.split(".", 1)[0].strip().lower() for r in replies if r.strip()]
    assert len(set(opening_phrases)) >= 6


def test_manyasha_first_normal_starter_fallback_quality() -> None:
    scenarios = [
        (
            "У меня долги",
            ("долг", "доход", "имуществ", "исполнитель"),
            ("долг", "доход", "имуществ", "пристав"),
        ),
        (
            "Приставы списывают",
            ("пристав", "исполнитель", "удержан"),
            ("пристав", "исполнитель", "удержан"),
        ),
        (
            "МФЦ или суд?",
            ("мфц", "суд", "исполнитель"),
            ("мфц", "суд", "пристав"),
        ),
    ]
    replies: list[str] = []
    speech_replies: list[str] = []

    for question, reply_keywords, speech_keywords in scenarios:
        bundle = api_app._manyasha_fallback_reply_bundle(question)  # noqa: SLF001
        reply = str(bundle.get("reply") or "").strip()
        speech_reply = str(bundle.get("speech_reply") or "").strip()
        reply_lc = reply.lower()
        speech_lc = speech_reply.lower()

        assert reply
        assert speech_reply
        assert len(reply) <= 520
        assert 80 <= len(speech_reply) <= 220
        assert all(token in reply_lc for token in reply_keywords), (question, reply)
        assert all(token in speech_lc for token in speech_keywords), (question, speech_reply)
        assert "банкротство можно рассмотреть" not in reply_lc
        assert "по вашему вопросу" not in reply_lc
        assert "гарантир" not in reply_lc
        assert "гарантир" not in speech_lc
        replies.append(reply)
        speech_replies.append(speech_reply)

    assert len(set(replies)) == len(scenarios)
    assert len(set(speech_replies)) == len(scenarios)


def test_manyasha_chat_uses_navy_provider_when_enabled(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 4.2)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "sk-navy-test")
    monkeypatch.setattr(api_app, "NAVY_MODEL", "gpt-5")

    calls = {"navy": 0}

    def _navy_ok(_messages, timeout_seconds=None):
        calls["navy"] += 1
        return (
            "Я помогаю по долгам и банкротству: могу сравнить МФЦ и суд, разобрать риски и подсказать следующий шаг.\n\n"
            "[НАСТР:НЕЙТРАЛЬНО]"
        )

    def _unexpected_provider(*_args, **_kwargs):
        raise AssertionError("unexpected fallback provider call")

    monkeypatch.setattr(api_app, "_navy_chat_complete", _navy_ok)
    monkeypatch.setattr(api_app, "_ollama_chat_complete", _unexpected_provider)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", _unexpected_provider)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-navy-provider",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            response = client.post(
                "/api/manyasha/chat",
                json={"message": "Что ты умеешь?", "history": []},
            )
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)

    assert response.status_code == 200
    payload = response.json()
    assert calls["navy"] == 1
    assert "помога" in str(payload.get("reply") or "").lower()
    assert str(payload.get("speech_reply") or "").strip()


def test_manyasha_chat_falls_back_to_ollama_when_navy_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 4.2)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "sk-navy-test")
    monkeypatch.setattr(api_app, "NAVY_MODEL", "gpt-5")

    calls = {"navy": 0, "ollama": 0}

    def _navy_fail(_messages, timeout_seconds=None):
        calls["navy"] += 1
        return None

    def _ollama_ok(_messages, timeout_seconds=None):
        calls["ollama"] += 1
        return (
            "Вижу вашу ситуацию по долгам. Давайте сначала проверим тип обязательств и текущие действия приставов, "
            "чтобы выбрать безопасный путь.\n\n[НАСТР:НЕЙТРАЛЬНО]"
        )

    def _unexpected_gemini(*_args, **_kwargs):
        raise AssertionError("gemini should not be used when ollama succeeded")

    monkeypatch.setattr(api_app, "_navy_chat_complete", _navy_fail)
    monkeypatch.setattr(api_app, "_ollama_chat_complete", _ollama_ok)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", _unexpected_gemini)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-navy-fallback",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            response = client.post(
                "/api/manyasha/chat",
                json={"message": "Приставы списывают деньги, что делать?", "history": []},
            )
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)

    assert response.status_code == 200
    payload = response.json()
    assert calls["navy"] == 1
    assert calls["ollama"] == 1
    assert "Вижу вашу ситуацию по долгам" in str(payload.get("reply") or "")
    assert str(payload.get("speech_reply") or "").strip()


def test_manyasha_chat_relevance_guard_replaces_generic_provider_answer(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 4.2)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "sk-navy-test")

    captured_system_prompts: list[str] = []

    def _navy_irrelevant(messages, timeout_seconds=None):
        assert messages
        captured_system_prompts.append(str(messages[0].get("content") or ""))
        return "Понимаю. Банкротство можно рассмотреть. [НАСТР:НЕЙТРАЛЬНО]"

    monkeypatch.setattr(api_app, "_navy_chat_complete", _navy_irrelevant)
    monkeypatch.setattr(api_app, "_ollama_chat_complete", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", lambda *_args, **_kwargs: None)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-relevance-guard",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            response = client.post(
                "/api/manyasha/chat",
                json={"message": "Что ты умеешь?", "history": []},
            )
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)

    assert response.status_code == 200
    payload = response.json()
    reply = str(payload.get("reply") or "").lower()
    speech_reply = str(payload.get("speech_reply") or "").lower()
    assert "я маняша" in reply or "я помога" in reply
    assert "банкротство можно рассмотреть" not in reply
    assert "я помога" in speech_reply or "я маняша" in speech_reply
    assert captured_system_prompts
    assert "Сначала отвечать по существу на ПОСЛЕДНЕЕ сообщение пользователя" in captured_system_prompts[0]
    assert "На короткие starters" in captured_system_prompts[0]


def test_manyasha_chat_relevance_guard_replaces_bad_provider_replies_by_intent(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 4.2)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "sk-navy-test")

    bad_replies = {
        "Приставы списывают деньги, что делать?": (
            "У меня долги крупного размера (~500 тыс. руб.), и приставы списали часть заработной платы. "
            "Я уже обратилась в суд с заявлениями о признании долгов непогашенными."
        ),
        "Можно ли сохранить квартиру при банкротстве?": (
            "К сожалению, у вас непонятно конкретный вопрос обстоятельствах. "
            "Уточните сумму долга и судьбу вашего имущества."
        ),
        "Я работаю официально, это плохо?": (
            "Официальная занятость включает вас в категорию безнадзорных лиц. "
            "Теперь уточню долговые обязательства."
        ),
        "Чем МФЦ отличается от суда?": (
            "МФЦ и суд различаются тем, что в одном случае вы решаете вопрос через Единую платформу, "
            "а во втором направляете документы."
        ),
        "Что ты умеешь?": "Я могу помочь с банкроством и общими вопросами.",
    }

    expected_keywords = {
        "Приставы списывают деньги, что делать?": ("пристав", "исполнитель", "удержан"),
        "Можно ли сохранить квартиру при банкротстве?": ("квартир", "единствен", "ипотек"),
        "Я работаю официально, это плохо?": ("официаль", "доход", "удержан"),
        "Чем МФЦ отличается от суда?": ("мфц", "суд"),
        "Что ты умеешь?": ("я маняша", "помога"),
    }

    def _navy_bad(messages, timeout_seconds=None):
        user_text = str(messages[-1].get("content") or "")
        return bad_replies[user_text] + "\n\n[НАСТР:НЕЙТРАЛЬНО]"

    monkeypatch.setattr(api_app, "_navy_chat_complete", _navy_bad)
    monkeypatch.setattr(api_app, "_ollama_chat_complete", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", lambda *_args, **_kwargs: None)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-bad-provider-guard",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            for question, keywords in expected_keywords.items():
                response = client.post("/api/manyasha/chat", json={"message": question, "history": []})
                assert response.status_code == 200
                payload = response.json()
                reply = str(payload.get("reply") or "").strip()
                speech_reply = str(payload.get("speech_reply") or "").strip()
                combined = (reply + " " + speech_reply).lower()
                assert all(keyword in combined for keyword in keywords), (question, reply, speech_reply)
                assert "безнадзор" not in combined
                assert "единая платформа" not in combined
                assert "банкрост" not in combined
                assert "у меня долги крупного размера" not in combined
                assert speech_reply.endswith((".", "!", "?", "…")), (question, speech_reply)
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)


def test_manyasha_speech_reply_builder_does_not_cut_mid_thought() -> None:
    reply = (
        "При долговой нагрузке около 2 000 000 рублей важно сразу оценить состав долгов, доход и ограничения. "
        "В первую очередь оценивают тип обязательств, доход, имущество и исполнительные производства. "
        "Чтобы дать точный следующий шаг, уточните, пожалуйста: какой тип обязательств сейчас основной — кредиты, "
        "микрозаймы или смешанный долг; есть ли сейчас официальный доход."
    )
    speech_reply = api_app._speech_reply_from_reply_text(reply)  # noqa: SLF001
    assert speech_reply
    assert len(speech_reply) <= 220
    assert speech_reply.endswith((".", "!", "?", "…"))
    assert not speech_reply.lower().endswith((" сейчас.", " какой.", " что.", " если.", " или.", " для.", " по."))
    assert "2 000 000" in speech_reply
    assert "доход" in speech_reply.lower()


def test_manyasha_chat_relevance_guard_replaces_weak_legal_provider_replies(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 4.2)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "sk-navy-test")

    weak_replies = {
        "Можно ли сохранить квартиру при банкротстве?": (
            "Квартира может быть застрахованной на случай ипотеки, что позволяет избежать ее реализации для погашения долга."
        ),
        "Мне звонят коллекторы, что делать?": (
            "Первым шагом должно быть открытое общение с коллекторами, возможно под присмотром нотариуса "
            "для формирования соглашения-контракта."
        ),
        "Я работаю официально, это плохо?": (
            "Офичная трудовая деятельность — важный аспект. Важно убедиться в полной оплате заработных плат "
            "и отсутствии незаконных задержек на работе."
        ),
        "Сколько длится банкротство?": (
            "Банкротство занимает от 3 до 6 месяцев, включая подготовку документов и процесс передачи имущества взыскателям."
        ),
        "Приставы списывают деньги, что делать?": (
            "Важно немедленно связаться с приставами для уточнения порядка действия и остановки любых новых списаний. "
            "Возможно, потребуется встреча с представителями судебных органов."
        ),
    }

    expected_keywords = {
        "Можно ли сохранить квартиру при банкротстве?": ("единственное", "ипотека", "залог"),
        "Мне звонят коллекторы, что делать?": ("фикс", "данные", "законность"),
        "Я работаю официально, это плохо?": ("официаль", "доход", "прожиточный"),
        "Сколько длится банкротство?": ("мфц", "суд", "кредитор"),
        "Приставы списывают деньги, что делать?": ("исполнитель", "удержан", "защищ"),
    }

    def _navy_weak(messages, timeout_seconds=None):
        user_text = str(messages[-1].get("content") or "")
        return weak_replies[user_text] + "\n\n[НАСТР:НЕЙТРАЛЬНО]"

    monkeypatch.setattr(api_app, "_navy_chat_complete", _navy_weak)
    monkeypatch.setattr(api_app, "_ollama_chat_complete", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", lambda *_args, **_kwargs: None)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-weak-legal-guard",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    forbidden = (
        "страхов",
        "соглашения-контракта",
        "нотариус",
        "офичная",
        "передачи имущества взыскателям",
        "немедленно связаться с приставами",
    )

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            for question, keywords in expected_keywords.items():
                response = client.post("/api/manyasha/chat", json={"message": question, "history": []})
                assert response.status_code == 200
                payload = response.json()
                reply = str(payload.get("reply") or "").strip()
                speech_reply = str(payload.get("speech_reply") or "").strip()
                combined = (reply + " " + speech_reply).lower()
                assert all(keyword in combined for keyword in keywords), (question, reply, speech_reply)
                assert not any(term in combined for term in forbidden), (question, reply, speech_reply)
                assert 80 <= len(speech_reply) <= 220
                assert speech_reply.endswith((".", "!", "?", "…")), (question, speech_reply)
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)


def test_manyasha_fallback_uses_diagnostics_to_skip_known_questions() -> None:
    diagnostics = {
        "debt_amount": "2 000 000 рублей",
        "debt_amount_value": 2_000_000,
        "bailiffs": "есть списания",
        "missing_fields": ["тип долгов", "официальный доход", "есть ли приставы"],
    }

    bundle = api_app._manyasha_fallback_reply_bundle(  # noqa: SLF001
        "Что делать дальше по долгам?",
        diagnostics=diagnostics,
    )
    reply = str(bundle.get("reply") or "").strip()
    speech_reply = str(bundle.get("speech_reply") or "").strip()
    reply_lc = reply.lower()

    assert "2 000 000" in reply
    assert "спис" in reply_lc or "пристав" in reply_lc
    assert "по вашим словам" in reply_lc
    assert "какая сейчас примерная сумма" not in reply_lc
    assert "есть ли активные исполнительные производства" not in reply_lc
    assert "тип обязательств" in reply_lc
    assert "официальный доход" in reply_lc
    assert 80 <= len(speech_reply) <= 220
    assert speech_reply.endswith((".", "!", "?", "…"))


def test_manyasha_fallback_uses_income_and_property_diagnostics() -> None:
    income_bundle = api_app._manyasha_fallback_reply_bundle(  # noqa: SLF001
        "Я работаю официально, это плохо?",
        diagnostics={
            "income": "официальный доход",
            "missing_fields": ["имущество или жильё"],
        },
    )
    income_reply = str(income_bundle.get("reply") or "").strip().lower()
    income_speech = str(income_bundle.get("speech_reply") or "").strip().lower()
    assert "по вашим словам" in income_reply
    assert "официальный доход" in income_reply
    assert "прожиточный" in income_reply
    assert "есть ли сейчас официальный доход" not in income_reply
    assert "официаль" in income_speech and income_speech.endswith((".", "!", "?", "…"))

    property_bundle = api_app._manyasha_fallback_reply_bundle(  # noqa: SLF001
        "Можно ли сохранить квартиру при банкротстве?",
        diagnostics={
            "property": ["квартира", "ипотека/залог"],
            "missing_fields": ["единственное жильё"],
        },
    )
    property_reply = str(property_bundle.get("reply") or "").strip().lower()
    property_speech = str(property_bundle.get("speech_reply") or "").strip().lower()
    assert "по вашим словам" in property_reply
    assert "квартира" in property_reply
    assert "ипотек" in property_reply and "залог" in property_reply
    assert "единственное" in property_reply
    assert "доли" in property_reply or "сделк" in property_reply
    assert "есть ли имущество" not in property_reply
    assert "квартир" in property_speech and property_speech.endswith((".", "!", "?", "…"))


def test_manyasha_case_memory_picks_best_followup_from_missing_fields() -> None:
    debt_bailiffs_diagnostics = {
        "debt_amount": "2 000 000 рублей",
        "debt_amount_value": 2_000_000,
        "bailiffs": "есть списания",
        "known_count": 2,
        "missing_fields": ["есть ли приставы", "официальный доход", "имущество или жильё"],
        "risk_level": "high",
        "risk_reasons": ["крупная сумма долга", "приставы списывают деньги"],
    }
    followups = api_app._build_debt_followup_questions(  # noqa: SLF001
        "Приставы списывают деньги",
        debt_bailiffs_diagnostics,
    )

    assert 1 <= len(followups) <= 2
    combined = " ".join(followups).lower()
    assert "пристав" not in combined
    assert "сумм" not in combined
    assert "официальный доход" in combined or "имущество" in combined

    income_diagnostics = {
        "income": "официальный доход",
        "bailiffs": "есть списания",
        "missing_fields": ["официальный доход", "имущество или жильё"],
    }
    income_followups = api_app._build_debt_followup_questions(  # noqa: SLF001
        "Работаю официально",
        income_diagnostics,
    )
    income_combined = " ".join(income_followups).lower()
    assert "есть ли сейчас официальный доход" not in income_combined
    assert "размер удержаний" in income_combined or "имущество" in income_combined

    property_followups = api_app._build_debt_followup_questions(  # noqa: SLF001
        "Есть квартира в ипотеке",
        {
            "property": ["квартира", "ипотека/залог"],
            "missing_fields": ["единственное жильё", "тип долгов"],
        },
    )
    property_combined = " ".join(property_followups).lower()
    assert "есть ли имущество" not in property_combined
    assert "единственное" in property_combined
    assert "доли" in property_combined or "сделк" in property_combined


def test_manyasha_chat_sends_diagnostics_context_to_provider(monkeypatch) -> None:
    monkeypatch.setattr(api_app, "MANYASHA_CHAT_LLM_TIMEOUT_SECONDS", 4.2)
    monkeypatch.setattr(api_app, "MANYASHA_LLM_PROVIDER", "navy")
    monkeypatch.setattr(api_app, "NAVY_API_KEY", "sk-navy-test")

    captured_messages: list[dict] = []

    def _navy_ok(messages, timeout_seconds=None):
        captured_messages.extend(messages)
        return (
            "По вашим словам, уже есть списания у приставов. Сначала проверяем исполнительное производство, "
            "размер удержаний и защищённые выплаты.\n\n[НАСТР:СОЧУВСТВИЕ]"
        )

    monkeypatch.setattr(api_app, "_navy_chat_complete", _navy_ok)
    monkeypatch.setattr(api_app, "_ollama_chat_complete", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(api_app, "_gemini_chat_complete", lambda *_args, **_kwargs: None)

    def _override_auth():
        return api_app.WidgetAuthContext(
            partner_id=api_app.DEFAULT_DEV_PARTNER_ID,
            session_id="pytest-manyasha-diagnostics-context",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )

    def _override_get_db():
        yield _DummySession()

    api_app.app.dependency_overrides[api_app.require_widget_auth] = _override_auth
    api_app.app.dependency_overrides[api_app.get_db] = _override_get_db
    try:
        with TestClient(api_app.app) as client:
            response = client.post(
                "/api/manyasha/chat",
                json={
                    "message": "Приставы списывают деньги, что делать?",
                    "history": [],
                    "profile": {
                        "diagnostics": {
                            "debt_amount": "2 000 000 рублей",
                            "debt_amount_value": 2_000_000,
                            "bailiffs": "есть списания",
                            "income": "официальный доход",
                            "known_count": 3,
                            "risk_level": "high",
                            "risk_reasons": ["крупная сумма долга", "приставы списывают деньги"],
                            "missing_fields": ["тип долгов", "имущество или жильё"],
                        }
                    },
                },
            )
    finally:
        api_app.app.dependency_overrides.pop(api_app.require_widget_auth, None)
        api_app.app.dependency_overrides.pop(api_app.get_db, None)

    assert response.status_code == 200
    prompt_text = "\n".join(str(message.get("content") or "") for message in captured_messages)
    assert "Диагностика Маняши" in prompt_text
    assert "2 000 000 рублей" in prompt_text
    assert "приставы=есть списания" in prompt_text
    assert "доход=официальный доход" in prompt_text
    assert "известных пунктов=3" in prompt_text
    assert "уровень риска=high" in prompt_text
    assert "причины риска=крупная сумма долга, приставы списывают деньги" in prompt_text
    assert "Не спрашивай повторно известные поля" in prompt_text
    assert "Выбери один лучший следующий вопрос" in prompt_text
    payload = response.json()
    reply = str(payload.get("reply") or "").lower()
    assert "исполнитель" in reply and "удержан" in reply


def test_manyasha_cache_key_changes_with_message_and_recent_history() -> None:
    key_base = api_app._make_cache_key(  # noqa: SLF001
        "Чем МФЦ отличается от суда?",
        [{"role": "user", "content": "базовый вопрос"}],
    )
    key_other_message = api_app._make_cache_key(  # noqa: SLF001
        "Какие документы нужны?",
        [{"role": "user", "content": "базовый вопрос"}],
    )
    key_other_history = api_app._make_cache_key(  # noqa: SLF001
        "Чем МФЦ отличается от суда?",
        [{"role": "user", "content": "другая последняя реплика про приставов"}],
    )

    assert key_base != key_other_message
    assert key_base != key_other_history


def test_manyasha_cache_key_changes_with_diagnostics() -> None:
    base_history = [{"role": "user", "content": "базовый вопрос"}]
    key_without_diagnostics = api_app._make_cache_key(  # noqa: SLF001
        "Что делать дальше?",
        base_history,
    )
    key_with_diagnostics = api_app._make_cache_key(  # noqa: SLF001
        "Что делать дальше?",
        base_history,
        {"debt_amount": "2 000 000 рублей", "bailiffs": "есть списания"},
    )

    assert key_without_diagnostics != key_with_diagnostics


def test_consultation_request_accepts_whitelisted_diagnostics_packet() -> None:
    request = api_app.ConsultationRequestCreate(
        name="Тест",
        phone="+70000000000",
        email="lead@example.com",
        question="Нужна консультация",
        session_id="lead-diagnostics-session",
        diagnostics={
            "debt_amount": "2 000 000 рублей",
            "debt_amount_value": 2_000_000,
            "debt_types": ["кредиты/карты"],
            "bailiffs": "есть списания",
            "income": "официальный доход",
            "property": ["квартира", "ипотека/залог"],
            "collectors": "звонят коллекторы",
            "route_hint": "court_or_check",
            "risk_level": "high",
            "risk_reasons": ["крупная сумма долга", "приставы списывают деньги"],
            "missing_fields": ["тип долгов", "имущество или жильё"],
            "known_count": 5,
            "summary_shown": True,
            "updated_at": 1777293069739,
            "localStorage": {"secret": "must-not-pass"},
        },
    )

    metadata = api_app._attach_diagnostics_lead_packet({}, request.diagnostics, request.diagnostic_summary)  # noqa: SLF001
    diagnostics = metadata["diagnostics"]

    assert metadata["diagnostic_summary"] == diagnostics
    assert diagnostics["debt_amount"] == "2 000 000 рублей"
    assert diagnostics["bailiffs"] == "есть списания"
    assert diagnostics["income"] == "официальный доход"
    assert diagnostics["property"] == ["квартира", "ипотека/залог"]
    assert diagnostics["risk_level"] == "high"
    assert diagnostics["known_count"] == 5
    assert "debt_amount_value" not in diagnostics
    assert "summary_shown" not in diagnostics
    assert "updated_at" not in diagnostics
    assert "localStorage" not in diagnostics


def test_consultation_and_handoff_old_payloads_without_diagnostics_still_work() -> None:
    request = api_app.ConsultationRequestCreate(
        name="Тест",
        phone="+70000000000",
        email="lead@example.com",
        question="Нужна консультация",
        session_id="old-lead-session",
    )
    handoff = api_app.HandoffRequest(session_id="old-handoff-session", reason="Нужен юрист")

    assert request.diagnostics == {}
    assert request.diagnostic_summary == {}
    assert api_app._attach_diagnostics_lead_packet({}, request.diagnostics, request.diagnostic_summary) == {}  # noqa: SLF001
    assert handoff.context == {}


def test_handoff_context_sanitizes_diagnostics_and_keeps_risk_amount() -> None:
    raw_context = {
        "source": "manual_handoff",
        "diagnostics": {
            "debt_amount": "2 000 000 рублей",
            "bailiffs": "есть списания",
            "risk_level": "high",
            "risk_reasons": ["крупная сумма долга"],
            "known_count": 2,
            "updated_at": 1777293069739,
        },
    }

    context = api_app._attach_diagnostics_lead_packet(raw_context, raw_context["diagnostics"])  # noqa: SLF001
    assert context["source"] == "manual_handoff"
    assert context["diagnostics"]["debt_amount"] == "2 000 000 рублей"
    assert context["diagnostic_summary"] == context["diagnostics"]
    assert "updated_at" not in context["diagnostics"]
    assert api_app._extract_debt_amount(context) == 2_000_000  # noqa: SLF001
