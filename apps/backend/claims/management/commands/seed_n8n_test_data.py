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


class Command(BaseCommand):
    help = "Seed an unreviewed, un-forwarded claim submission for n8n workflow testing."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding raw submitted claim for n8n workflow tests..."))

        provider_id = uuid.UUID("4363d1f2-89ef-453a-9122-6ab1c923c3de")
        plan_id = uuid.UUID("5e2e9e16-863e-4df8-bab8-e5373c7c1b9a")
        external_id = "seed-cust-001"

        with transaction.atomic():
            # 1. Verify provider & plan
            provider = Partner.objects.filter(id=provider_id).first()
            if not provider:
                self.stderr.write(self.style.ERROR(f"Provider {provider_id} not found. Ensure base seed ran."))
                return
            plan = InsurancePlan.objects.filter(id=plan_id).first()
            if not plan:
                self.stderr.write(self.style.ERROR(f"Plan {plan_id} not found. Ensure base seed ran."))
                return

            now = timezone.now()
            today = timezone.localdate()

            # 2. Customer owned by the provider's own partner key (no user account)
            customer, created = Customer.objects.get_or_create(
                partner=provider, external_id=external_id,
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
                    customer=customer, customer_external_id=customer.external_id, partner=provider,
                    consent_obtained=True, consent_obtained_at=now, consent_scope="seed",
                    consent_reference="SEED", api_key_fingerprint="seed", ip_address=None)

            if not customer.has_settlement:
                customer.settlement_account_name = "Tolu Adeyemi"
                customer.settlement_bank_account = "0123456789"
                customer.settlement_bank_code = "058"
                customer.save()

            # 3. Active policy subscription (assumes DateFields)
            subscription, _ = PolicySubscription.objects.get_or_create(
                customer=customer, plan=plan, provider=provider,
                defaults={
                    "status": "active",
                    "start_date": today - timedelta(days=30),
                    "end_date": today + timedelta(days=335),
                    "amount_paid": Decimal("85000.00"),
                },
            )

            # 4. Fresh, raw claim (unchecked and not forwarded)
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

            # 5. Attach mandatory documents by direct .file.name assignment (bypasses Cloudinary API)
            required_docs = REQUIRED_CLAIM_DOCUMENTS.get("motor_accident", [])
            for doc_type in required_docs:
                doc = ClaimDocument.objects.create(claim=claim, document_type=doc_type)
                doc.file.name = f"claims/documents/{claim.claim_reference}_{doc_type}.pdf"
                doc.save(update_fields=["file"])

            self.stdout.write(self.style.SUCCESS(
                f"\n--- Fresh Test Claim Created for n8n ---"
                f"\nClaim ID:         {claim.id}"
                f"\nClaim Ref:        {claim.claim_reference}"
                f"\nStatus:           {claim.status}"
                f"\nForwarded At:     {claim.forwarded_at} (None -> provider cannot see yet)"
                f"\nClaimed Amount:   ₦{claim.claimed_amount}"
                f"\nDocuments:        {claim.documents.count()}/{len(required_docs)} attached"
                f"\nCustomer:         {customer.email} (external_id={customer.external_id})"
                f"\nFiling partner:   {provider.name}"
                f"\n----------------------------------------\n"
            ))
