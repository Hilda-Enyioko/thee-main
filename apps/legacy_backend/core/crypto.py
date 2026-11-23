"""
Cryptographic helper utilities for at-rest field encryption.
Uses Fernet symmetric key encryption with multi-key rotation capability.
"""

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings


def _mf() -> MultiFernet:
    """
    Builds a MultiFernet instance using FIELD_ENCRYPTION_KEYS.
    settings.FIELD_ENCRYPTION_KEYS = [newest, ..., oldest] (Fernet.generate_key())
    Encryption encrypts with the primary (first) key; decryption attempts keys in sequence.
    """
    keys = getattr(settings, "FIELD_ENCRYPTION_KEYS", [])
    if not keys:
        raise ValueError("settings.FIELD_ENCRYPTION_KEYS must be configured.")
    return MultiFernet([Fernet(k) for k in keys])


def encrypt_field(v: str) -> str:
    """Encrypts a plaintext string value into an ASCII ciphertext string."""
    return _mf().encrypt(v.encode()).decode() if v else ""


def decrypt_field(t: str) -> str:
    """Decrypts a ciphertext string token back into plaintext."""
    return _mf().decrypt(t.encode()).decode() if t else ""