"""
Idempotency handler for partner-authenticated write operations.
Stores and validates requests using (partner, endpoint, key), where endpoint
scopes method and fully-resolved path (including URL/path parameters).
"""

import hashlib
import json
from datetime import timedelta
from typing import Any, Callable, Union

from django.db import connection, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.renderers import JSONRenderer
from rest_framework.request import Request
from rest_framework.response import Response

from .models import IdempotencyRecord, Partner

IDEMPOTENCY_TTL = timedelta(hours=24)


def compute_request_hash(data: Any) -> str:
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


def _normalize_endpoint(endpoint_or_request: Union[str, Request]) -> str:
    """
    Normalizes the endpoint target to include HTTP method and resolved path.
    Example: 'PUT:/customers/cust_123'
    """
    if isinstance(endpoint_or_request, Request) or hasattr(endpoint_or_request, "path"):
        method = getattr(endpoint_or_request, "method", "POST").upper()
        path = getattr(endpoint_or_request, "path", "")
        return f"{method}:{path}"
    return str(endpoint_or_request)


def _lock(partner: Partner, endpoint: str, key: str) -> None:
    """
    Acquires a transaction-scoped advisory lock in PostgreSQL for the given tuple.
    The lock automatically releases on transaction commit or rollback.
    Maps a SHA-256 digest to a signed 64-bit integer (-2^63 to 2^63 - 1) for pg_advisory_xact_lock.
    """
    digest = hashlib.sha256(f"{partner.id}:{endpoint}:{key}".encode("utf-8")).hexdigest()
    val = int(digest[:16], 16)
    if val >= (1 << 63):
        val -= 1 << 64

    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [val])


def process_idempotent_request(
    partner: Partner,
    endpoint: Union[str, Request],
    key: str,
    request_data: Any,
    execute_callable: Callable[[], Response],
) -> Response:
    """
    Executes execute_callable() under an idempotency guarantee.
    If key or partner is not provided, simply executes execute_callable().

    `endpoint` can be a DRF Request object (which resolves to '{METHOD}:{request.path}')
    or an explicitly formatted string such as 'PUT:/customers/cust_123'.
    """
    if not key or not partner:
        return execute_callable()

    scoped_endpoint = _normalize_endpoint(endpoint)
    request_hash = compute_request_hash(request_data)
    cutoff = timezone.now() - IDEMPOTENCY_TTL

    with transaction.atomic():
        _lock(partner, scoped_endpoint, key)

        existing = (
            IdempotencyRecord.objects
            .filter(partner=partner, endpoint=scoped_endpoint, key=key)
            .first()
        )

        if existing:
            if existing.created_at < cutoff:
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
                resp = Response(existing.response_body, status=existing.response_code)
                resp["Idempotent-Replayed"] = "true"
                return resp

        response = execute_callable()

        # Non-2xx responses must leave no DB modifications behind
        if not (200 <= response.status_code < 300):
            transaction.set_rollback(True)
            return response

        # Cache successful response (2xx) and persist record
        raw_data = getattr(response, "data", None)
        response_body = (
            json.loads(JSONRenderer().render(raw_data))
            if raw_data is not None
            else {}
        )

        IdempotencyRecord.objects.create(
            partner=partner,
            endpoint=scoped_endpoint,
            key=key,
            request_hash=request_hash,
            response_code=response.status_code,
            response_body=response_body,
        )

        return response
