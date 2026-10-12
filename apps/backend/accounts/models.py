"""
Unified identity, partner tenancy, access control, and compliance models.
Addresses NDPA consent auditing, immutable trails, and sensitive identity protection.
"""

import uuid
import secrets
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

from core.models import Partner, SettlementDetails
from core.storage import KYCDocumentStorage


# Custom User ------------------------------------------------------------------------

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        extra_fields.setdefault("role", "customer")
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "super_admin")
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        staff_user = Staff(email=email, created_by=None, **extra_fields)
        staff_user.set_password(password)
        staff_user.save(using=self._db)
        return staff_user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """Unified user authentication foundation table."""

    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("support_admin", "Support Admin"),
        ("service_account", "Service Account"),
        ("partner_admin", "Partner Admin"),
        ("customer", "Customer"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"


# Staff --------------------------------------------------------------------------------

class StaffManager(models.Manager):
    """Manager rules protecting staff provisioning."""

    def create_staff(self, *, created_by, email, first_name, last_name,
                     role, password=None, **extra_fields):
        if created_by is None or created_by.role != "super_admin":
            raise ValidationError("Only a Super Admin can create a staff account.")
        if role not in dict(Staff.STAFF_ROLES):
            raise ValidationError(f"'{role}' is not a valid staff role.")

        staff = Staff(
            email=CustomUser.objects.normalize_email(email),
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_staff=True,
            created_by=created_by,
            **extra_fields,
        )
        staff.set_password(password)
        staff.save()
        return staff


class Staff(CustomUser):
    """Multi-table inheritance representing internal organizational staff nodes."""

    STAFF_ROLES = [
        ("super_admin", "Super Admin"),
        ("support_admin", "Support Admin"),
        ("service_account", "Service Account"),
    ]

    customuser_ptr = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        parent_link=True,
        primary_key=True,
        related_name="staff_profile",
    )

    created_by = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="staff_created",
        null=True,
        blank=True,
        help_text="The Super Admin who provisioned this account.",
    )
    is_two_factor_enabled = models.BooleanField(default=False)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivated_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_deactivated",
    )

    objects = StaffManager()

    def clean(self):
        super().clean()
        if self.role not in dict(self.STAFF_ROLES):
            raise ValidationError(
                f"role must be one of {list(dict(self.STAFF_ROLES).keys())} for a Staff account, got '{self.role}'."
            )

    def deactivate(self, *, by):
        if by.role != "super_admin":
            raise ValidationError("Only a Super Admin can deactivate a staff account.")
        self.is_active = False
        self.deactivated_at = timezone.now()
        self.deactivated_by = by
        self.save(update_fields=["is_active", "deactivated_at", "deactivated_by"])

    def __str__(self):
        return f"{self.email} — Staff ({self.role})"


class StaffLoginEvent(models.Model):
    """Append-only login auditing stream for security log analysis."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="login_trail")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    successful = models.BooleanField(default=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "OK" if self.successful else "FAILED"
        return f"{self.staff.email} — {status} @ {self.created_at:%Y-%m-%d %H:%M}"


# Partner Admin -----------------------------------------------------------------------------

class PartnerAdminManager(models.Manager):
    """Manager controlling invitation pathways for business partners."""

    def invite_team_member(self, *, inviter, email, first_name, last_name, role):
        if inviter.role != "partner_admin":
            raise ValidationError(
                "Only a partner_admin can invite new team members to the organization."
            )
        if role not in dict(PartnerAdmin.ROLE_CHOICES):
            raise ValidationError(f"'{role}' is not a valid team role.")

        user = CustomUser.objects.create_user(
            email=email, first_name=first_name, last_name=last_name,
            role="partner_admin",
            is_active=False,
        )
        return self.create(
            user=user, partner=inviter.partner, role=role, invited_by=inviter.user
        )


class PartnerAdmin(models.Model):
    """Profile isolating partner authority attributes from core authentication records."""

    ROLE_CHOICES = [
        ("partner_admin", "Partner Admin"),
        ("support_partner_admin", "Support Partner Admin"),
        ("partner_viewer", "Partner Viewer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="partner_admin_profile"
    )
    partner = models.ForeignKey(
        Partner, on_delete=models.CASCADE, related_name="admins"
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default="partner_admin")
    invited_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="team_members_invited",
        help_text="The partner_admin who invited this team member.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = PartnerAdminManager()

    def __str__(self):
        return f"{self.user.email} — {self.partner.name} ({self.role})"


# Customer Profile ----------------------------------------------------------------------

class CustomerProfile(SettlementDetails):
    """Siloed demographic metadata block matching a user to a transactional partner."""

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="customer_profiles"
    )
    partner = models.ForeignKey(
        Partner, on_delete=models.CASCADE, related_name="legacy_customer_profiles"
    )
    phone_number = models.CharField(max_length=20)
    date_of_birth = models.DateField(null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "partner"]

    def __str__(self):
        return f"{self.user.email} — {self.partner.name}"


# Customer (Partner-Scoped) -------------------------------------------------------------

class Customer(SettlementDetails):
    """
    Partner-scoped customer record, completely decoupled from Django auth users.
    Identified and keyed uniquely by (partner, external_id).
    Inherits SettlementDetails only if claim payouts route to the customer.
    """

    KYC_STATUS_CHOICES = [
        ("verified", "Verified"),
        ("unverified", "Unverified"),
        ("not_provided", "Not Provided"),
    ]

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.ForeignKey(
        Partner, on_delete=models.CASCADE, related_name="customers"
    )
    external_id = models.CharField(
        max_length=255, db_index=True,
        help_text="Partner's own identifier for this customer."
    )

    # Core identity fields
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    # email is optional at the model level for distributor workflows where emails may be unavailable
    email = models.EmailField(db_index=True, blank=True)
    phone_number = models.CharField(max_length=30, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    address = models.TextField(blank=True)
    id_type = models.CharField(
        max_length=50, blank=True,
        help_text="e.g. nin, bvn, passport, drivers_licence, voters_card"
    )
    # id_number stores encrypted cipher text (via Fernet helper in core.crypto)
    id_number = models.CharField(
        max_length=255,
        blank=True,
        help_text="Encrypted NIN/BVN token. Must not be returned in plaintext API responses, logs, or webhooks."
    )

    # Flexible product-specific data
    extra_data = models.JSONField(default=dict, blank=True)

    # Partner KYC attestation (stored as given, TheeInsurance does not verify)
    kyc_status = models.CharField(
        max_length=20, choices=KYC_STATUS_CHOICES, default="not_provided",
        help_text="Partner's claim regarding customer verification status. Stored as given; TheeInsurance does not verify it."
    )
    kyc_verified_by = models.CharField(max_length=255, blank=True, help_text="Partner organization/agent asserting verification.")
    kyc_method = models.CharField(max_length=100, blank=True, help_text="Method used by partner (e.g. bvn_lookup, physical_id).")
    kyc_verified_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when partner verified customer.")
    kyc_reference = models.CharField(max_length=255, blank=True, help_text="Partner-side verification reference number.")

    # Consent fields (NDPA compliance snapshot)
    consent_obtained = models.BooleanField(
        default=False,
        help_text="True if partner has confirmed obtaining customer consent to process and share data."
    )
    consent_obtained_at = models.DateTimeField(null=True, blank=True)
    consent_scope = models.CharField(
        max_length=255,
        default="TheeInsurance and relevant insurance provider",
        help_text="Scope of data processing and sharing consent."
    )
    consent_reference = models.CharField(max_length=255, blank=True, help_text="Optional partner-side proof or reference ID.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["partner", "external_id"],
                name="unique_partner_customer_external_id",
            )
        ]
        ordering = ["-created_at"]

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.full_name} ({self.external_id}) — {self.partner.name}"


# Immutable Customer Consent Log ------------------------------------------------------

class CustomerConsentLogQuerySet(models.QuerySet):
    """Enforces immutability at the QuerySet level to prevent bulk alterations/deletions."""

    def update(self, **kwargs):
        raise ValidationError("CustomerConsentLog records are immutable and cannot be updated.")

    def delete(self):
        raise ValidationError("CustomerConsentLog records are append-only audit entries and cannot be deleted.")


class CustomerConsentLog(models.Model):
    """
    Immutable, append-only record tracking customer consent submissions and updates.
    Customer foreign key uses SET_NULL alongside a denormalized customer_external_id
    so audit trails survive customer deletion / NDPA erasure requests.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consent_logs",
        help_text="SET_NULL retains the audit line if the customer record is deleted under NDPA erasure."
    )
    customer_external_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Denormalized identifier preserving the audit subject if Customer is removed."
    )
    partner = models.ForeignKey(
        Partner,
        on_delete=models.PROTECT,
        related_name="customer_consent_logs",
        help_text="Partner reference is protected to prevent orphaned regulatory audit trails."
    )
    consent_obtained = models.BooleanField()
    consent_obtained_at = models.DateTimeField()
    consent_scope = models.CharField(max_length=255)
    consent_reference = models.CharField(max_length=255, blank=True)
    api_key_fingerprint = models.CharField(max_length=32, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = CustomerConsentLogQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("CustomerConsentLog records are immutable and cannot be updated.")

        if self.customer and not self.customer_external_id:
            self.customer_external_id = self.customer.external_id

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("CustomerConsentLog records cannot be deleted.")

    def __str__(self):
        ref = self.customer_external_id or (self.customer.external_id if self.customer else "Unknown")
        return f"Consent for {ref} @ {self.created_at:%Y-%m-%d %H:%M}"


# KYC -----------------------------------------------------------------------------------

class CustomerKYC(models.Model):
    """Identity tracking and verification data linked directly to a customer profile."""

    ID_TYPE_CHOICES = [
        ("nin", "National Identity Number"),
        ("bvn", "Bank Verification Number"),
        ("passport", "International Passport"),
        ("drivers_licence", "Driver's Licence"),
        ("voters_card", "Voter's Card"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField(
        CustomerProfile, on_delete=models.CASCADE, related_name="kyc"
    )
    id_type = models.CharField(max_length=20, choices=ID_TYPE_CHOICES)
    id_number = models.CharField(max_length=50)
    id_document = models.FileField(
        upload_to="kyc/customers/id/",
        storage=KYCDocumentStorage(),
    )
    selfie = models.FileField(
        upload_to="kyc/customers/selfie/",
        blank=True,
        storage=KYCDocumentStorage(),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    review_note = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.customer.user.email} — {self.id_type} ({self.status})"


class PartnerKYC(models.Model):
    """Legal corporate authentication records filed by registered business entities."""

    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    partner = models.OneToOneField(Partner, on_delete=models.CASCADE, related_name="kyc")
    rc_number = models.CharField(max_length=20, unique=True)
    naicom_licence_number = models.CharField(max_length=50, blank=True)
    tax_identification_number = models.CharField(max_length=20, unique=True)

    cac_certificate = models.FileField(
        upload_to="kyc/partners/cac/", storage=KYCDocumentStorage()
    )
    naicom_licence_doc = models.FileField(
        upload_to="kyc/partners/naicom/", blank=True, storage=KYCDocumentStorage()
    )
    proof_of_address = models.FileField(
        upload_to="kyc/partners/address/", storage=KYCDocumentStorage()
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.CharField(max_length=255, blank=True)
    review_note = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.partner.name} — {self.status}"


# Service Account ---------------------------------------------------------------------------

class ServiceAccountCredential(models.Model):
    """Machine-to-machine authentication tokens decoupled from passwords or sessions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.OneToOneField(
        Staff,
        on_delete=models.CASCADE,
        related_name="service_credential",
        limit_choices_to={"role": "service_account"},
    )
    name = models.CharField(max_length=100)
    client_id = models.CharField(max_length=64, unique=True, editable=False)
    client_secret_hash = models.CharField(max_length=128, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def set_secret(self, raw_secret: str) -> None:
        self.client_secret_hash = make_password(raw_secret)

    def check_secret(self, raw_secret: str) -> bool:
        return check_password(raw_secret, self.client_secret_hash)

    def save(self, *args, **kwargs):
        if not self.client_id:
            self.client_id = secrets.token_urlsafe(24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.client_id})"
