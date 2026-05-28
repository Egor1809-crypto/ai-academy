from __future__ import annotations

from uuid import uuid4


def test_rpg_event_idempotency_keeps_xp_at_plus_one(client):
    partner_id = uuid4()
    event_id = uuid4()
    headers = {"X-Partner-Id": str(partner_id)}
    payload = {
        "event_id": str(event_id),
        "partner_id": str(partner_id),
        "event_type": "XP_GAIN",
        "points_delta": 1,
        "qi_delta": 0,
        "sp_delta": 0,
        "rp_delta": 0,
        "payload": {"case_id": str(uuid4())},
    }

    first = client.post("/api/v1/rpg/event", json=payload, headers=headers)
    second = client.post("/api/v1/rpg/event", json=payload, headers=headers)
    progress = client.get("/api/v1/rpg/progress", params={"partner_id": str(partner_id)}, headers=headers)

    assert first.status_code == 200
    assert first.json()["applied"] is True
    assert first.json()["duplicate"] is False
    assert first.json()["progress"]["xp"] == 1

    assert second.status_code == 200
    assert second.json()["applied"] is False
    assert second.json()["duplicate"] is True
    assert second.json()["progress"]["xp"] == 1

    assert progress.status_code == 200
    assert progress.json()["xp"] == 1


def test_direct_add_xp_endpoint_is_forbidden(client):
    partner_id = uuid4()

    response = client.post(
        "/api/v1/rpg/add-xp",
        json={"partner_id": str(partner_id), "xp": 999999},
        headers={"X-Partner-Id": str(partner_id)},
    )

    assert response.status_code == 403
    assert "Прямое начисление XP запрещено" in response.json()["detail"]