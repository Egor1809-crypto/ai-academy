from __future__ import annotations

import base64
import json
import struct
from uuid import UUID

from mascot_talk_service import MascotTalkContext, MascotTalkService
from partner_dashboard import LocalDevStorageSigner, configure_storage_signer


PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWvya4AAAAASUVORK5CYII="
)


def build_triangle_gltf_bytes() -> bytes:
    positions = struct.pack("<9f", 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0)
    indices = struct.pack("<3H", 0, 1, 2)
    buffer = positions + indices
    buffer_b64 = base64.b64encode(buffer).decode()
    payload = {
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1}]}],
        "buffers": [{"uri": f"data:application/octet-stream;base64,{buffer_b64}", "byteLength": len(buffer)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(positions), "target": 34962},
            {"buffer": 0, "byteOffset": len(positions), "byteLength": len(indices), "target": 34963},
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": 3,
                "type": "VEC3",
                "min": [0.0, 0.0, 0.0],
                "max": [1.0, 1.0, 0.0],
            },
            {"bufferView": 1, "componentType": 5123, "count": 3, "type": "SCALAR"},
        ],
    }
    return json.dumps(payload).encode("utf-8")


def login_dev_auth(client):
    response = client.post("/api/v1/partner/dev-auth/login", json={})
    assert response.status_code == 200
    return response.json()


def configure_local_dev_storage(monkeypatch, tmp_path):
    monkeypatch.setenv("DEV_STORAGE_DIR", str(tmp_path))
    configure_storage_signer(LocalDevStorageSigner(storage_root=tmp_path))


def upload_asset(client, headers, file_name: str, content_type: str, payload: bytes):
    response = client.post(
        "/api/v1/partner/mascot/upload",
        json={
            "file_name": file_name,
            "content_type": content_type,
            "size_bytes": len(payload),
        },
        headers=headers,
    )
    assert response.status_code == 200
    upload = response.json()

    put_response = client.put(upload["url"], content=payload, headers=upload["required_headers"])
    assert put_response.status_code == 201
    return upload


def test_runtime_returns_placeholder_when_partner_has_no_asset(client):
    session = login_dev_auth(client)
    response = client.get(
        "/api/v1/partner/mascot/runtime",
        headers={"Authorization": f"Bearer {session['token']}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "placeholder3d"
    assert payload["status"] == "demo"
    assert payload["asset_id"] is None
    assert payload["sprite_url"] == "/mascot-demo.svg"


def test_runtime_rejects_x_partner_id_auth_when_header_mode_disabled(client):
    response = client.get(
        "/api/v1/partner/mascot/runtime",
        headers={"X-Partner-Id": "00000000-0000-0000-0000-000000000001"},
    )

    assert response.status_code == 401
    assert "X-Partner-Id" in response.json()["detail"]


def test_png_upload_switches_runtime_to_sprite2d(client, monkeypatch, tmp_path):
    configure_local_dev_storage(monkeypatch, tmp_path)
    session = login_dev_auth(client)
    headers = {"Authorization": f"Bearer {session['token']}"}

    upload_asset(
        client,
        headers,
        file_name="demo-sprite.png",
        content_type="image/png",
        payload=PNG_BYTES,
    )

    runtime_response = client.get("/api/v1/partner/mascot/runtime", headers=headers)
    assert runtime_response.status_code == 200
    runtime = runtime_response.json()

    assert runtime["mode"] == "sprite2d"
    assert runtime["status"] == "ready"
    assert runtime["content_type"] == "image/png"
    assert runtime["source_url"] is None
    assert runtime["sprite_url"]
    assert runtime["preview_url"] == runtime["sprite_url"]

    file_response = client.get(runtime["sprite_url"])
    assert file_response.status_code == 200
    assert file_response.content == PNG_BYTES


def test_gltf_upload_replaces_previous_sprite_with_uploaded_model(client, monkeypatch, tmp_path):
    configure_local_dev_storage(monkeypatch, tmp_path)
    session = login_dev_auth(client)
    headers = {"Authorization": f"Bearer {session['token']}"}

    upload_asset(
        client,
        headers,
        file_name="demo-sprite.png",
        content_type="image/png",
        payload=PNG_BYTES,
    )
    first_runtime = client.get("/api/v1/partner/mascot/runtime", headers=headers).json()

    gltf_bytes = build_triangle_gltf_bytes()
    upload_asset(
        client,
        headers,
        file_name="demo-triangle.gltf",
        content_type="model/gltf+json",
        payload=gltf_bytes,
    )

    runtime_response = client.get("/api/v1/partner/mascot/runtime", headers=headers)
    assert runtime_response.status_code == 200
    runtime = runtime_response.json()

    assert runtime["mode"] == "uploaded-model"
    assert runtime["status"] == "ready"
    assert runtime["content_type"] == "model/gltf+json"
    assert runtime["source_url"]
    assert runtime["preview_url"] == runtime["source_url"]
    assert runtime["sprite_url"] is None
    assert runtime["asset_id"] != first_runtime["asset_id"]

    file_response = client.get(runtime["source_url"])
    assert file_response.status_code == 200
    assert file_response.content == gltf_bytes


def test_mascot_talk_stream_returns_reply_and_actions(client):
    session = login_dev_auth(client)
    headers = {
        "Authorization": f"Bearer {session['token']}",
        "Accept": "text/event-stream",
    }

    response = client.post(
        "/api/v1/partner/mascot/talk",
        json={
            "message": "Где посмотреть статус дела?",
            "current_route": "/partner/mascot",
            "history": [{"role": "user", "content": "Привет"}],
            "case_context": {},
        },
        headers=headers,
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert '"token":' in response.text
    assert '"done": true' in response.text
    assert '/partner/analytics' in response.text


def test_saved_prompt_influences_mascot_talk_style(client):
    session = login_dev_auth(client)
    headers = {
        "Authorization": f"Bearer {session['token']}",
        "Accept": "text/event-stream",
    }

    save_response = client.patch(
        "/api/v1/partner/prompt",
        json={"prompt_text": "Отвечай кратко и по делу."},
        headers={"Authorization": f"Bearer {session['token']}"},
    )
    assert save_response.status_code == 200

    response = client.post(
        "/api/v1/partner/mascot/talk",
        json={
            "message": "Как загрузить ассет?",
            "current_route": "/partner/mascot",
            "history": [],
            "case_context": {},
        },
        headers=headers,
    )

    assert response.status_code == 200
    assert 'Коротко:' in response.text
    assert '"prompt_version": 1' in response.text


def test_mascot_talk_service_falls_back_when_provider_raises():
    class BrokenProvider:
        name = "broken-provider"

        def build_reply(self, context, actions, provider_prompt):
            raise RuntimeError("provider unavailable")

    service = MascotTalkService(provider=BrokenProvider())
    plan = service.build_plan(
        MascotTalkContext(
            partner_id=UUID("00000000-0000-0000-0000-000000000001"),
            message="Где посмотреть статус?",
            current_route="/partner/mascot",
            history=[],
            case_context={},
            runtime_mode="placeholder3d",
            runtime_status="demo",
            level="Стажёр",
            weighted_score=0,
            partner_prompt_text=None,
            partner_prompt_version=None,
        )
    )

    assert plan.provider_name == "broken-provider->fallback:rule-based"
    assert "аналити" in plan.reply_text.lower()
