"""
Payments Serializers Module.

Two serializers covering the payment lifecycle:
  2. TransactionSerializer      — read-only representation of Transaction state
"""

import logging
from urllib.parse import urlparse
from django.conf import settings
from rest_framework import serializers
from subscriptions.models import PolicySubscription
from .models import Transaction

logger = logging.getLogger(__name__)


class TransactionSerializer(serializers.ModelSerializer):
    subscription_id = serializers.UUIDField(source="subscription.id", read_only=True)
    subscription_status = serializers.CharField(source="subscription.status", read_only=True)
    customer_external_id = serializers.CharField(source="subscription.customer.external_id", read_only=True)
    initiated_by_partner = serializers.CharField(source="initiated_by_partner.name", read_only=True, default=None)

    class Meta:
        model = Transaction
        fields = ["id", "reference", "amount", "currency", "payment_type", "payment_status", "gateway",
                  "gateway_reference", "subscription_id", "subscription_status", "customer_external_id",
                  "initiated_by_partner", "created_at", "updated_at"]
        read_only_fields = fields


class CheckoutRequestSerializer(serializers.Serializer):
    callback_url = serializers.URLField(
        required=False, max_length=500,
        help_text="Where Paystack sends the customer afterwards (`?reference=...` is appended). Must be https on your "
                  "own domain (the `website` in your partner profile, or a subdomain). Defaults to the platform's page.")

    def validate_callback_url(self, value):
        partner = self.context["partner"]
        url = urlparse(value)
        host = (url.hostname or "").lower()
        if settings.DEBUG and host in {"localhost", "127.0.0.1"}:
            return value
        site = (urlparse(partner.website).hostname or "").lower().removeprefix("www.") if partner.website else ""
        if not site:
            raise serializers.ValidationError("Add your website to your partner profile before using callback_url.")
        if url.scheme != "https":
            raise serializers.ValidationError("callback_url must use https.")
        if host != site and not host.endswith("." + site):
            raise serializers.ValidationError("callback_url must be on your registered website's domain.")
        return value
