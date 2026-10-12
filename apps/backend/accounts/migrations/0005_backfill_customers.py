from django.db import migrations

KYC_MAP = {"approved": "verified", "pending": "unverified", "rejected": "unverified"}

def forwards(apps, schema_editor):
    from core.crypto import encrypt_field
    Profile = apps.get_model("accounts", "CustomerProfile")
    KYC = apps.get_model("accounts", "CustomerKYC")
    Customer = apps.get_model("accounts", "Customer")
    kycs = {k.customer_id: k for k in KYC.objects.all()}

    for p in Profile.objects.select_related("user").iterator():
        k = kycs.get(p.id)
        approved = bool(k and k.status == "approved")

        c, created = Customer.objects.get_or_create(
            partner_id=p.partner_id, external_id=str(p.id),
            defaults=dict(
                first_name=p.user.first_name, last_name=p.user.last_name,
                email=p.user.email, phone_number=p.phone_number,
                date_of_birth=p.date_of_birth, gender=p.gender, address=p.address,
                settlement_account_name=p.settlement_account_name,
                settlement_bank_account=p.settlement_bank_account,
                settlement_bank_code=p.settlement_bank_code,
                id_type=k.id_type if k else "",
                id_number=encrypt_field(k.id_number) if k else "",
                kyc_status=KYC_MAP[k.status] if k else "not_provided",
                kyc_verified_by="TheeInsurance (legacy review)" if approved else "",
                kyc_verified_at=k.reviewed_at if approved else None,
                kyc_reference=str(k.id) if k else "",
                consent_obtained=False,
            ),
        )
        if created:  # auto_now_add overrides created_at on insert
            Customer.objects.filter(pk=c.pk).update(created_at=p.created_at)

class Migration(migrations.Migration):
    dependencies = [("accounts", "0004_alter_customerprofile_partner_customer_and_more")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
