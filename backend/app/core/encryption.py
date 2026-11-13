"""Reversible encryption for secrets that must be shown to authorized users.

The lockbox code cannot be hashed because the Provider has to read it and set it
on the physical lockbox. AES-256-GCM gives confidentiality and integrity.
"""

import base64
import binascii
import hashlib
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings
from app.core.exceptions import ConfigurationError

KEY_VERSION = "v1"
NONCE_BYTES = 12


def encrypt_secret(plaintext: str) -> str:
    """Return a version-prefixed, URL-safe ciphertext for a short secret."""
    nonce = os.urandom(NONCE_BYTES)
    ciphertext = AESGCM(_key()).encrypt(nonce, plaintext.encode("utf-8"), None)
    payload = base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")
    return f"{KEY_VERSION}:{payload}"


def decrypt_secret(value: str) -> str:
    version, separator, payload = value.partition(":")
    if not separator or version != KEY_VERSION:
        raise ConfigurationError("Unsupported handover code encryption format")

    try:
        raw = base64.urlsafe_b64decode(payload.encode("ascii"))
        if len(raw) <= NONCE_BYTES:
            raise ValueError("Ciphertext is too short")
        plaintext = AESGCM(_key()).decrypt(raw[:NONCE_BYTES], raw[NONCE_BYTES:], None)
    except (InvalidTag, ValueError, binascii.Error) as exc:
        raise ConfigurationError(
            "Handover code cannot be decrypted; check HANDOVER_ENCRYPTION_KEY"
        ) from exc
    return plaintext.decode("utf-8")


def _key() -> bytes:
    secret = settings.handover_encryption_key.strip()
    if not secret:
        raise ConfigurationError("HANDOVER_ENCRYPTION_KEY is not configured")
    # Settings accept a human-readable secret; AES needs exactly 32 bytes.
    return hashlib.sha256(secret.encode("utf-8")).digest()
