import uuid
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Customer, CustomerConsentLog
from core.models import Partner
from plans.models import InsurancePlan
from subscriptions.models import PolicySubscription
from claims.models import Claim, ClaimDocument, REQUIRED_CLAIM_DOCUMENTS


def filter_model_fields(model_cls, data_dict):
    """Keep only keys that correspond to actual fields on the model."""
    valid_field_names = {f.name for f in model_cls._meta.fields}
    return {k: v for k, v in data_dict.items() if k in valid_field_names}


class Command(BaseCommand):
    help = "Seed an unreviewed, un-forwarded claim submission for n8n workflow testing."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding raw submitted claim for n8n workflow tests..."))

        provider_id = uuid.UUID("a7c2e9d4-5b3f-4e1a-9d8c-6b5a4f3e2d1c")
        plan_id = uuid.UUID("c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f")
        category_id = uuid.UUID("0b6f1d52-7c1a-4f0e-9d3a-5e2c8b7a1f10")
        external_id = "seed-cust-001"

        with transaction.atomic():
            now = timezone.now()
            today = timezone.localdate()

            # 1. Ensure Partner exists
            raw_partner_defaults = {
                "name": "Sunrise Assurance Plc",
                "partner_type": "provider",
                "phone_number": "+2348098765432",
                "address": "5 Marina, Lagos Island",
            }
            partner_defaults = filter_model_fields(Partner, raw_partner_defaults)

            provider, _ = Partner.objects.get_or_create(
                id=provider_id,
                defaults=partner_defaults,
            )

            # 2. Ensure Plan Category exists
            category_model = InsurancePlan._meta.get_field("category").remote_field.model
            raw_category_defaults = {
                "name": "Motor",
                "slug": "motor",
                "description": "Motor insurance policies",
                "is_active": True,
            }
            category_defaults = filter_model_fields(category_model, raw_category_defaults)

            category, _ = category_model.objects.get_or_create(
                id=category_id,
                defaults=category_defaults,
            )

            # 3. Ensure InsurancePlan exists with category attached
            raw_plan_defaults = {
                "name": "Motor Comprehensive Plus",
                "provider": provider,
                "category": category,
                "coverage_level": "comprehensive",
                "coverage_amount": Decimal("5000000.00"),
                "premium": Decimal("85000.00"),
                "premium_amount": Decimal("85000.00"),
                "duration_months": 12,
                "description": "Full cover incl. theft, fire, third party and flood damage.",
                "visibility": "public",
                "is_active": True,
            }
            plan_defaults = filter_model_fields(InsurancePlan, raw_plan_defaults)

            plan, _ = InsurancePlan.objects.get_or_create(
                id=plan_id,
                defaults=plan_defaults,
            )

            # 4. Customer owned by provider
            customer, created = Customer.objects.get_or_create(
                partner=provider,
                external_id=external_id,
                defaults={
                    "first_name": "Tolu",
                    "last_name": "Adeyemi",
                    "email": "customer@test.com",
                    "phone_number": "08012345678",
                    "date_of_birth": "1995-06-15",
                    "gender": "female",
                    "address": "12 Broad Street, Lagos Island, Lagos",
                    "settlement_account_name": "Tolu Adeyemi",
                    "settlement_bank_account": "0123456789",
                    "settlement_bank_code": "058",
                    "consent_obtained": True,
                    "consent_obtained_at": now,
                    "consent_scope": "seed",
                },
            )
            if created:
                CustomerConsentLog.objects.create(
                    customer=customer,
                    customer_external_id=customer.external_id,
                    partner=provider,
                    consent_obtained=True,
                    consent_obtained_at=now,
                    consent_scope="seed",
                    consent_reference="SEED",
                    api_key_fingerprint="seed",
                    ip_address=None,
                )

            if not customer.has_settlement:
                customer.settlement_account_name = "Tolu Adeyemi"
                customer.settlement_bank_account = "0123456789"
                customer.settlement_bank_code = "058"
                customer.save()

            # 5. Active policy subscription
            subscription, _ = PolicySubscription.objects.get_or_create(
                customer=customer,
                plan=plan,
                provider=provider,
                defaults={
                    "status": "active",
                    "start_date": today - timedelta(days=30),
                    "end_date": today + timedelta(days=335),
                    "amount_paid": Decimal("85000.00"),
                },
            )

            # 6. Fresh, raw claim
            claim = Claim.objects.create(
                subscription=subscription,
                customer=customer,
                provider=provider,
                claim_type="motor_accident",
                status="submitted",
                incident_date=today - timedelta(days=2),
                incident_description="Front bumper damage from a minor collision along Lekki Expressway.",
                claimed_amount=Decimal("175000.00"),
            )

            # 7. Attach mandatory documents
            required_docs = REQUIRED_CLAIM_DOCUMENTS.get("motor_accident", [])
            for doc_type in required_docs:
                doc = ClaimDocument.objects.create(claim=claim, document_type=doc_type)
                doc.file.name = f"claims/documents/{claim.claim_reference}_{doc_type}.pdf"
                doc.save(update_fields=["file"])

            self.stdout.write(
                self.style.SUCCESS(
                    f"\n--- Fresh Test Claim Created for n8n ---"
                    f"\nClaim ID:         {claim.id}"
                    f"\nClaim Ref:        {claim.claim_reference}"
                    f"\nStatus:           {claim.status}"
                    f"\nForwarded At:     {claim.forwarded_at} (None -> provider cannot see yet)"
                    f"\nClaimed Amount:   ₦{claim.claimed_amount}"
                    f"\nDocuments:        {claim.documents.count()}/{len(required_docs)} attached"
                    f"\nCustomer:         {customer.email} (external_id={customer.external_id})"
                    f"\nFiling partner:   {provider.name} (id={provider.id})"
                    f"\nCategory:         {category.name} (id={category.id})"
                    f"\nPlan:             {plan.name} (id={plan.id})"
                    f"\n----------------------------------------\n"
                )
            )
