"""Customer create-or-merge. All business rules live here; the view stays thin."""
from django.db import IntegrityError, transaction
from django.utils import timezone

from core.crypto import encrypt_field
from .models import Customer, CustomerConsentLog

_DIRECT = ("first_name", "last_name", "email", "phone_number", "date_of_birth", "gender", "address", "id_type")
_KYC_MAP = {"status": "kyc_status", "verified_by": "kyc_verified_by", "method": "kyc_method",
            "verified_at": "kyc_verified_at", "reference": "kyc_reference"}
_CONSENT_MAP = {"obtained": "consent_obtained", "obtained_at": "consent_obtained_at",
                "scope": "consent_scope", "reference": "consent_reference"}


def _apply(customer, partner, d):
    for f in _DIRECT:
        if f in d:
            setattr(customer, f, d[f])
    if "id_number" in d:
        customer.id_number = encrypt_field(d["id_number"])
    if "extra_data" in d:
        merged = dict(customer.extra_data or {})
        for k, v in d["extra_data"].items():
            if v is None:
                merged.pop(k, None)
            else:
                merged[k] = v
        customer.extra_data = merged
    for k, v in d.get("settlement", {}).items():      # keys are model attr names (SettlementSerializer uses source=)
        setattr(customer, k, v)
    for k, v in d.get("kyc", {}).items():
        setattr(customer, _KYC_MAP[k], v)
    if customer.kyc_status == "verified" and not customer.kyc_verified_by:
        customer.kyc_verified_by = partner.name
    consent = d.get("consent")
    if consent:
        for k, v in consent.items():
            setattr(customer, _CONSENT_MAP[k], v)
        if "obtained_at" not in consent:
            customer.consent_obtained_at = timezone.now()


def _log_consent(customer, partner, ip_address):
    CustomerConsentLog.objects.create(
        customer=customer, customer_external_id=customer.external_id, partner=partner,
        consent_obtained=customer.consent_obtained,
        consent_obtained_at=customer.consent_obtained_at or timezone.now(),
        consent_scope=customer.consent_scope, consent_reference=customer.consent_reference,
        api_key_fingerprint=partner.api_key_hash[:16],     # a hash prefix, never the key
        ip_address=ip_address,
    )


def upsert_customer(partner, external_id, data, *, ip_address=None):
    """Create or merge-update a partner's customer. Returns (customer, created)."""
    with transaction.atomic():
        customer = (Customer.objects.select_for_update()
                    .filter(partner=partner, external_id=external_id).first())
        created = customer is None
        if created:
            customer = Customer(partner=partner, external_id=external_id)
        _apply(customer, partner, data)
        try:
            with transaction.atomic():     # savepoint so a lost create race doesn't poison the outer transaction
                customer.save()
        except IntegrityError:
            winner = (Customer.objects.select_for_update()
                      .filter(partner=partner, external_id=external_id).first()) if created else None
            if winner is None:
                raise
            customer, created = winner, False
            _apply(customer, partner, data)
            customer.save()
        if created or "consent" in data:
            _log_consent(customer, partner, ip_address)
    return customer, created
