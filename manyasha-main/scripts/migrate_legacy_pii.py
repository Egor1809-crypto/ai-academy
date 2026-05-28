#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
import secrets
from typing import Iterable

from sqlalchemy.orm import Session

from app import UserPersonalData
from rpg_engine import engine


def _require_encryption_key() -> bytes:
    raw_key = (os.getenv("ENCRYPTION_KEY") or "").strip()
    if not raw_key:
        raise RuntimeError("ENCRYPTION_KEY is required for migration.")
    return hashlib.sha256(raw_key.encode("utf-8")).digest()


def _decrypt_aes(blob: bytes, key: bytes) -> str | None:
    if not blob or len(blob) < 13:
        return None
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:
        raise RuntimeError("cryptography package is required for migration.") from exc
    try:
        nonce, ciphertext = blob[:12], blob[12:]
        if not ciphertext:
            return None
        cipher = AESGCM(key)
        return cipher.decrypt(nonce, ciphertext, None).decode("utf-8")
    except Exception:
        return None


def _decode_legacy_plaintext(blob: bytes) -> str | None:
    try:
        text = blob.decode("utf-8").strip()
    except Exception:
        return None
    if not text:
        return None
    if len(text) > 4096:
        return None
    return text


def _encrypt_text(value: str, key: bytes) -> bytes:
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:
        raise RuntimeError("cryptography package is required for migration.") from exc
    nonce = secrets.token_bytes(12)
    cipher = AESGCM(key)
    return nonce + cipher.encrypt(nonce, value.encode("utf-8"), None)


def _iter_pii_fields() -> Iterable[str]:
    return ("email_enc", "phone_enc", "full_name_enc", "notes_enc")


def migrate_legacy_pii(*, dry_run: bool = False) -> tuple[int, int]:
    key = _require_encryption_key()
    scanned = 0
    changed_rows = 0
    with Session(engine) as db:
        rows = db.query(UserPersonalData).all()
        for row in rows:
            scanned += 1
            row_changed = False
            for field in _iter_pii_fields():
                blob = getattr(row, field)
                if not blob:
                    continue
                if _decrypt_aes(blob, key) is not None:
                    continue
                plaintext = _decode_legacy_plaintext(blob)
                if plaintext is None:
                    continue
                setattr(row, field, _encrypt_text(plaintext, key))
                row_changed = True
            if row_changed:
                changed_rows += 1
        if dry_run:
            db.rollback()
        else:
            db.commit()
    return scanned, changed_rows


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Re-encrypt legacy plaintext PII in app.user_personal_data using AES-GCM format "
            "(nonce + ciphertext)."
        )
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and report rows without writing changes.",
    )
    args = parser.parse_args()

    scanned, changed = migrate_legacy_pii(dry_run=args.dry_run)
    mode = "dry-run" if args.dry_run else "commit"
    print(f"[migrate_legacy_pii] mode={mode} scanned_rows={scanned} changed_rows={changed}")
    if not args.dry_run:
        print("[migrate_legacy_pii] done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
