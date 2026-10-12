"""
Idempotency handler for partner-authenticated write operations.
Stores and validates requests using (partner, endpoint, key).
"""

import hashlib
import json
from datetime import timedelta
from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status

from .models import IdempotencyRecord, Partner

IDEMPOTENCY_TTL = timedelta(hours=24)


def compute_request_hash(data) -> str:
    """Computes a deterministic SHA-256 digest of normalized request data."""
    if data is None:
        raw = b""
    elif isinstance(data, (bytes, bytearray)):
        raw = data
    elif isinstance(data, str):
        raw = data.encode("utf-8")
    else:
        try:
            raw = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
        except Exception:
            raw = str(data).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


class IdempotencyConflict(Exception):
    """Raised when the same idempotency key is reused with different request payload."""
    pass


def process_idempotent_request(partner: Partner, endpoint: str, key: str, request_data, execute_callable):
    """
    Executes execute_callable() under idempotency guarantee.
    If key is None or empty, simply executes execute_callable().
    """
    if not key or not partner:
        return execute_callable()

    request_hash = compute_request_hash(request_data)
    cutoff = timezone.now() - IDEMPOTENCY_TTL

    # First check existing record with select_for_update within a sub-transaction
    with transaction.atomic():
        existing = (
            IdempotencyRecord.objects
            .select_for_update()
            .filter(partner=partner, endpoint=endpoint, key=key)
            .first()
        )

        if existing:
            # Check if expired
            if existing.created_at < cutoff:
                # Expired: delete and re-process
                existing.delete()
            else:
                if existing.request_hash != request_hash:
                    return Response(
                        {
                            "error": "Idempotency key reused with different request payload.",
                            "code": "idempotency_conflict",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )
                return Response(existing.response_body, status=existing.response_code)

        # Execute view logic
        response = execute_callable()

        # Cache only successful / client-controlled responses (2xx and 4xx except 5xx)
        if response.status_code < 500:
            try:
                response_data = response.data if hasattr(response, "data") else None
                IdempotencyRecord.objects.create(
                    partner=partner,
                    endpoint=endpoint,
                    key=key,
                    request_hash=request_hash,
                    response_code=response.status_code,
                    response_body=response_data,
                )
            except IntegrityError:
                # Concurrent request raced us and inserted
                racing = (
                    IdempotencyRecord.objects
                    .filter(partner=partner, endpoint=endpoint, key=key)
                    .first()
                )
                if racing:
                    if racing.request_hash != request_hash:
                        return Response(
                            {
                                "error": "Idempotency key reused with different request payload.",
                                "code": "idempotency_conflict",
                            },
                            status=status.HTTP_409_CONFLICT,
                        )
                    return Response(racing.response_body, status=racing.response_code)

    return response
