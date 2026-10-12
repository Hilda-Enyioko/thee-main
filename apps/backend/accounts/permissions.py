from rest_framework.permissions import BasePermission


def _role(request):
    u = request.user
    return u.role if (u and u.is_authenticated) else None

class IsSuperAdmin(BasePermission):
    """TheeInsurance super admin only."""
    def has_permission(self, request, view):
        return _role(request) == "super_admin"


class IsPartnerAdmin(BasePermission):
    """Any partner_admin user, provider or distributor."""
    def has_permission(self, request, view):
        return _role(request) == "partner_admin"


class IsPartnerAdminOfOwnOrg(BasePermission):
    def has_permission(self, request, view):
        profile = getattr(request.user, "partner_admin_profile", None)
        return bool(profile and profile.role == "partner_admin")

    def has_object_permission(self, request, view, obj):
        # obj is the PartnerAdmin being created/modified; must be the same org
        return obj.partner_id == request.user.partner_admin_profile.partner_id


def _partner_type(request):
    if _role(request) != "partner_admin":
        return None
    profile = getattr(request.user, "partner_admin_profile", None)
    return profile.partner.partner_type if profile else None


class IsProviderAdmin(BasePermission):
    """partner_admin users whose partner is of type 'provider'."""
    def has_permission(self, request, view):
        return _partner_type(request) == "provider"


class IsDistributorAdmin(BasePermission):
    """partner_admin users whose partner is of type 'distributor'."""
    def has_permission(self, request, view):
        return _partner_type(request) == "distributor"


class IsProviderOrSuperAdmin(BasePermission):
    """Provider admins and TheeInsurance super admins (shared review endpoints)."""
    def has_permission(self, request, view):
        return _role(request) == "super_admin" or _partner_type(request) == "provider"


class IsServiceAccount(BasePermission):
    """
    Internal service-to-service endpoints (n8n -> Django). The caller must hold a JWT issued by
    /staff/service-accounts/token/ for a Staff record with role='service_account'.
    """
    def has_permission(self, request, view):
        return _role(request) == "service_account"


class IsHumanStaff(BasePermission):
    """super_admin or support_admin, never a service account."""
    def has_permission(self, request, view):
        return _role(request) in ("super_admin", "support_admin")


class IsPartnerKey(BasePermission):
    """Request authenticated by X-Partner-Key (middleware already checked the key and KYC-active status)."""
    message = "A valid X-Partner-Key is required."

    def has_permission(self, request, view):
        return getattr(request, "partner", None) is not None
