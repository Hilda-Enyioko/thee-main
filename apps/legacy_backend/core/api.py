"""Base class and helpers for endpoints a partner's own backend calls with X-Partner-Key only (no JWT)."""
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter
from rest_framework import serializers
from rest_framework.views import APIView

from accounts.permissions import IsPartnerKey
from core.throttles import PartnerRateThrottle

IDEMPOTENCY_HEADER = OpenApiParameter(
    "Idempotency-Key", OpenApiTypes.STR, OpenApiParameter.HEADER, required=False,
    description="Unique string per logical request (max 255 chars). Retrying with the same key and body returns the "
                "original response with `Idempotent-Replayed: true`; the same key with a different body returns 409.")


class PartnerKeyAPIView(APIView):
    authentication_classes = []        # ignore any Authorization header; the middleware already checked the key
    permission_classes = [IsPartnerKey]
    throttle_classes = [PartnerRateThrottle]


def idempotency_key(request):
    key = request.headers.get("Idempotency-Key", "").strip()
    if len(key) > 255:
        raise serializers.ValidationError({"Idempotency-Key": ["Must be 255 characters or fewer."]})
    return key or None
