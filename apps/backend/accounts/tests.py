from django.test import TestCase
from accounts.models import Customer, CustomerConsentLog, Partner


class CustomerDeletionCascadeTest(TestCase):
    def setUp(self):
        self.partner = Partner.objects.create(name="Acme Insure")
        self.customer = Customer.objects.create(
            partner=self.partner,
            external_id="legacy-cust-001",
            first_name="Jane",
            last_name="Doe",
            consent_obtained=False,
        )
        self.consent_log = CustomerConsentLog.objects.create(
            customer=self.customer,
            partner=self.partner,
            channel="web_portal",
        )

    def test_deleting_customer_nulls_consent_log_fk_without_raising(self):
        customer_id = self.customer.pk
        log_id = self.consent_log.pk

        # Trigger customer deletion
        self.customer.delete()

        # Customer is removed
        self.assertFalse(Customer.objects.filter(pk=customer_id).exists())

        # Consent log persists with customer set to None
        self.consent_log.refresh_from_db()
        self.assertIsNone(self.consent_log.customer)
        self.assertEqual(self.consent_log.pk, log_id)
