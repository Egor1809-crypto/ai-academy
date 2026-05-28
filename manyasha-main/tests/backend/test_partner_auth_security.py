from __future__ import annotations

import hashlib
from uuid import UUID, uuid4

from partner_dashboard import DEFAULT_DEV_PARTNER_ID, Partner


def test_register_uses_scrypt_password_hash(client, db_session_factory):
    email = f"partner-{uuid4()}@example.com"
    response = client.post(
        "/api/v1/partner/auth/register",
        json={
            "name": "Test Partner",
            "email": email,
            "password": "SecretPassw0rd!",
        },
    )

    assert response.status_code == 201
    partner_id = UUID(response.json()["partner_id"])

    with db_session_factory() as db:
        partner = db.query(Partner).filter_by(id=partner_id).first()

    assert partner is not None
    assert partner.hashed_password.startswith("scrypt$")
    assert partner.hashed_password != hashlib.sha256("SecretPassw0rd!".encode("utf-8")).hexdigest()


def test_login_migrates_legacy_sha256_hash_to_scrypt(client, db_session_factory):
    password = "LegacyPassw0rd!"
    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    email = f"legacy-{uuid4()}@example.com"

    with db_session_factory() as db:
        partner = Partner(name="Legacy Partner", email=email, hashed_password=legacy_hash, is_active=True)
        db.add(partner)
        db.commit()
        db.refresh(partner)
        partner_id = partner.id

    login_response = client.post(
        "/api/v1/partner/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )
    assert login_response.status_code == 200

    with db_session_factory() as db:
        updated_partner = db.query(Partner).filter_by(id=partner_id).first()

    assert updated_partner is not None
    assert updated_partner.hashed_password.startswith("scrypt$")
    assert updated_partner.hashed_password != legacy_hash


def test_dev_auth_login_blocks_custom_partner_without_override_flag(client):
    response = client.post(
        "/api/v1/partner/dev-auth/login",
        json={
            "partner_id": str(uuid4()),
            "partner_name": "Injected Partner",
        },
    )

    assert response.status_code == 403
    assert "DEV_AUTH_ALLOW_CUSTOM_PARTNER" in response.json()["detail"]


def test_dev_auth_login_allows_default_partner(client):
    response = client.post("/api/v1/partner/dev-auth/login", json={})

    assert response.status_code == 200
    payload = response.json()
    assert payload["partner_id"] == str(DEFAULT_DEV_PARTNER_ID)
    assert payload["token"]


def test_dev_auth_disabled_outside_dev_test_env(client, monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("DEV_AUTH_ENABLED", "true")

    response = client.post("/api/v1/partner/dev-auth/login", json={})

    assert response.status_code == 404


def test_dev_storage_requires_explicit_flag(client, monkeypatch):
    monkeypatch.setenv("DEV_STORAGE_ENABLED", "false")

    response = client.get("/api/v1/partner/dev-storage/file/demo.png")

    assert response.status_code == 404
