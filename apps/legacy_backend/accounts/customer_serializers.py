"""Partner-facing customer serializers. id_number is write-only; responses only ever carry a masked value."""
import json
from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from core.crypto import decrypt_field
from .models import Customer
from .serializers import SettlementSerializer

ID_TYPES = ["nin", "bvn", "passport", "drivers_licence", "voters_card"]
MAX_EXTRA_BYTES = 16 * 1024
CLOCK_SKEW = timedelta(minutes=5)


def _not_future(value):
    if value > timezone.now() + CLOCK_SKEW:
        raise serializers.ValidationError("Cannot be in the future.")
    return value


class KYCAttestationSerializer(serializers.Serializer):
    """The partner's own claim about verifying this customer. TheeInsurance stores it and does not verify it."""
    status = serializers.ChoiceField(choices=Customer.KYC_STATUS_CHOICES)
    verified_by = serializers.CharField(
        max_length=255, required=False, allow_blank=True,
        help_text="Defaults to your organization's name when status is `verified`.")
    method = serializers.CharField(max_length=100, required=False, allow_blank=True)
    verified_at = serializers.DateTimeField(required=False, allow_null=True, validators=[_not_future])
    reference = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ConsentSerializer(serializers.Serializer):
    obtained = serializers.BooleanField(
        help_text="true = the customer consented to sharing their data with TheeInsurance and the insurance provider. "
                  "false = consent withdrawn.")
    obtained_at = serializers.DateTimeField(
        required=False, validators=[_not_future], help_text="When the customer gave it. Defaults to now.")
    scope = serializers.CharField(max_length=255, required=False)
    reference = serializers.CharField(max_length=255, required=False, allow_blank=True,
                                      help_text="Your own proof/reference ID for the consent record.")


class CustomerUpsertSerializer(serializers.Serializer):
    """
    PUT body. On create: first_name, last_name, email and consent.obtained=true are required.
    On update every field is optional and omitted fields are left unchanged (merge semantics).
    """
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone_number = serializers.RegexField(
        r"^\+?[\d\s\-()]{7,30}$", required=False, allow_blank=True,
        error_messages={"invalid": "Enter a valid phone number."})
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Customer.GENDER_CHOICES, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    id_type = serializers.ChoiceField(choices=ID_TYPES, required=False, allow_blank=True)
    id_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True, write_only=True,
        help_text="Stored encrypted. Never returned; responses show only a masked value.")
    extra_data = serializers.DictField(
        required=False,
        help_text="Free-form product data, shallow-merged into what is stored. A `null` value removes that key. Max 16 KB.")
    settlement = SettlementSerializer(required=False, help_text="Where claim payouts for this customer are sent.")
    kyc = KYCAttestationSerializer(required=False)
    consent = ConsentSerializer(required=False)

    def validate_email(self, value):
        return value.lower()

    def validate_date_of_birth(self, value):
        if value and (value > timezone.localdate() or value.year < 1900):
            raise serializers.ValidationError("Enter a realistic date of birth.")
        return value

    def validate_extra_data(self, value):
        if len(json.dumps(value, default=str)) > MAX_EXTRA_BYTES:
            raise serializers.ValidationError("extra_data must be 16 KB or smaller.")
        return value

    def validate(self, attrs):
        existing = self.context.get("existing")
        if existing is None:
            consent = attrs.get("consent")
            if not consent or consent.get("obtained") is not True:
                raise serializers.ValidationError(
                    {"consent": {"obtained": ["Customer consent must be confirmed (true) to create a customer."]}},
                    code="consent_required")
        id_type = attrs.get("id_type", existing.id_type if existing else "")
        if attrs.get("id_number") and not id_type:
            raise serializers.ValidationError({"id_type": ["Required when id_number is provided."]})
        return attrs


class CustomerSerializer(serializers.ModelSerializer):
    """Response shape. Deliberately has no `id_number` field."""
    id_number_masked = serializers.SerializerMethodField()
    settlement = serializers.SerializerMethodField()
    kyc = serializers.SerializerMethodField()
    consent = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ["id", "external_id", "first_name", "last_name", "email", "phone_number", "date_of_birth",
                  "gender", "address", "id_type", "id_number_masked", "extra_data",
                  "settlement", "kyc", "consent", "created_at", "updated_at"]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_id_number_masked(self, obj):
        if not obj.id_number:
            return None
        try:
            plain = decrypt_field(obj.id_number)
        except Exception:
            return "****"
        return f"****{plain[-4:]}" if len(plain) > 4 else "****"

    @extend_schema_field(SettlementSerializer(allow_null=True))
    def get_settlement(self, obj):
        return SettlementSerializer(obj).data if obj.has_settlement else None

    @extend_schema_field(KYCAttestationSerializer)
    def get_kyc(self, obj):
        return {"status": obj.kyc_status, "verified_by": obj.kyc_verified_by, "method": obj.kyc_method,
                "verified_at": obj.kyc_verified_at, "reference": obj.kyc_reference}

    @extend_schema_field(ConsentSerializer)
    def get_consent(self, obj):
        return {"obtained": obj.consent_obtained, "obtained_at": obj.consent_obtained_at,
                "scope": obj.consent_scope, "reference": obj.consent_reference}
