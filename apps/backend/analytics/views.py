from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsDistributorAdmin, IsProviderAdmin
from accounts.utils import get_partner_from_user
from core.throttles import PartnerRateThrottle
from subscriptions.models import PolicySubscription

def _six_months_ago():
    now = timezone.now()
    y, m = now.year, now.month - 5
    if m < 1:
        m, y = m + 12, y - 1
    return now.replace(year=y, month=m, day=1, hour=0, minute=0, second=0, microsecond=0)


def _monthly(qs, **aggregates):
    """Last 6 calendar months, DB-agnostic. Returns [{"month": "2026-10", "count": n, **aggregates}]."""
    rows = (qs.filter(created_at__gte=_six_months_ago())
            .annotate(m=TruncMonth("created_at"))
            .values("m")
            .annotate(count=Count("id"), **aggregates)
            .order_by("m"))
    return [{"month": r["m"].strftime("%Y-%m"), "count": r["count"],
             **{k: r[k] for k in aggregates}} for r in rows]


def get_partner_from_user(user):
    if hasattr(user, 'partner_admin_profile'):
        return user.partner_admin_profile.partner
    return None


# Provider Analytics
class ProviderSummaryView(APIView):
    """
    Aggregated subscription and revenue summary for a provider.
    IsProviderAdmin enforces: authenticated + partner_admin + provider type.
    No inline partner_type check needed.
    """
    permission_classes = [IsProviderAdmin]
    throttle_classes = [PartnerRateThrottle]

    @extend_schema(
        summary="Get Provider Analytics Summary",
        description=(
            "Calculates and returns aggregated metrics for the authenticated insurance provider, "
            "including total revenue, payouts, subscription status breakdown, top-performing plans, "
            "and performance across different distributors."
        ),
        responses={
            200: {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "object",
                        "properties": {
                            "total_policies": {"type": "integer", "example": 1540},
                            "total_revenue": {"type": "string", "example": "7700000.00"},
                            "total_payout": {"type": "string", "example": "6160000.00"},
                        }
                    },
                    "status_breakdown": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "status": {"type": "string", "example": "active"},
                                "count": {"type": "integer", "example": 1200}
                            }
                        }
                    },
                    "top_plans": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "plan__name": {"type": "string", "example": "Comprehensive Auto Shield"},
                                "total_sold": {"type": "integer", "example": 450},
                                "revenue": {"type": "string", "example": "2250000.00"}
                            }
                        }
                    },
                    "distributor_breakdown": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "distributor__name": {"type": "string", "example": "Nomba Finance"},
                                "total_sold": {"type": "integer", "example": 310},
                                "commission": {"type": "string", "example": "310000.00"}
                            }
                        }
                    }
                }
            },
            401: {"description": "Unauthorized access."},
            403: {"description": "Permission denied. Requires Provider Admin privileges."}
        },
        tags=["Analytics - Provider"]
    )
    def get(self, request):
        partner = get_partner_from_user(request.user)
        subscriptions = PolicySubscription.objects.filter(provider=partner)

        summary = subscriptions.aggregate(
            total_policies=Count('id'),
            total_revenue=Sum('amount_paid'),
            total_payout=Sum('provider_payout'),
        )

        status_breakdown = (
            subscriptions.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        top_plans = (
            subscriptions.values('plan__name')
            .annotate(total_sold=Count("id"), revenue=Sum("amount_paid"))
            .order_by("-total_sold")[:5]
        )

        distributor_breakdown = (
            subscriptions.filter(distributor__isnull=False)
            .values('distributor__name')
            .annotate(total_sold=Count("id"), commission=Sum("distributor_commission"))
            .order_by("-total_sold")
        )

        return Response({
            "summary": summary,
            "status_breakdown": list(status_breakdown),
            "top_plans": list(top_plans),
            "distributor_breakdown": list(distributor_breakdown),
        })


class ProviderSubscriptionsTrendsView(APIView):
    """
    Monthly subscription trends for a provider over the last 6 months.
    IsProviderAdmin enforced at class level.
    """
    permission_classes = [IsProviderAdmin]
    throttle_classes = [PartnerRateThrottle]

    @extend_schema(
        summary="Get Provider Subscription Trends",
        description="Returns month-on-month aggregations of volumes and revenue generated over time.",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "trends": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "month": {"type": "string", "example": "2026-06"},
                                "count": {"type": "integer", "example": 240},
                                "revenue": {"type": "string", "example": "1200000.00"}
                            }
                        }
                    }
                }
            },
            401: {"description": "Unauthorized access."},
            403: {"description": "Permission denied. Requires Provider Admin privileges."}
        },
        tags=["Analytics - Provider"]
    )
    def get(self, request):
        partner = get_partner_from_user(request.user)
        qs = PolicySubscription.objects.filter(provider=partner)
        return Response({"trends": _monthly(qs, revenue=Sum("amount_paid"))})


# Distributor Analytics
class DistributorSummaryView(APIView):
    """
    Aggregated facilitation and commission summary for a distributor.
    IsDistributorAdmin enforces: authenticated + partner_admin + distributor type.
    No inline partner_type check needed.
    """
    permission_classes = [IsDistributorAdmin]
    throttle_classes = [PartnerRateThrottle]

    @extend_schema(
        summary="Get Distributor Analytics Summary",
        description=(
            "Calculates and returns metrics for the authenticated partner distributor, "
            "including total policies sold, commissions earned, user acquisition count, "
            "and performance segmented by top insurance providers."
        ),
        responses={
            200: {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "object",
                        "properties": {
                            "total_policies_facilitated": {"type": "integer", "example": 820},
                            "total_commissions_earned": {"type": "string", "example": "820000.00"},
                            "total_customers": {"type": "integer", "example": 750}
                        }
                    },
                    "top_providers": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "provider__name": {"type": "string", "example": "Leadway Assurance"},
                                "total_sold": {"type": "integer", "example": 500}
                            }
                        }
                    },
                    "top_plans": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "plan__name": {"type": "string", "example": "Third Party Premium"},
                                "plan__category__name": {"type": "string", "example": "Auto"},
                                "total_sold": {"type": "integer", "example": 380}
                            }
                        }
                    }
                }
            },
            401: {"description": "Unauthorized access."},
            403: {"description": "Permission denied. Requires Distributor Admin privileges."}
        },
        tags=["Analytics - Distributor"]
    )
    def get(self, request):
        partner = get_partner_from_user(request.user)
        subscriptions = PolicySubscription.objects.filter(distributor=partner)

        summary = subscriptions.aggregate(
            total_policies_facilitated=Count("id"),
            total_commissions_earned=Sum("distributor_commission"),
            total_customers=Count("customer", distinct=True),
        )

        top_providers = (
            subscriptions.values('provider__name')
            .annotate(total_sold=Count("id"))
            .order_by("-total_sold")[:5]
        )

        top_plans = (
            subscriptions.values('plan__name', 'plan__category__name')
            .annotate(total_sold=Count("id"))
            .order_by("-total_sold")[:5]
        )

        return Response({
            "summary": summary,
            "top_providers": list(top_providers),
            "top_plans": list(top_plans),
        })


class DistributorSubscriptionsTrendsView(APIView):
    """
    Monthly facilitation trends for a distributor over the last 6 months.
    IsDistributorAdmin enforced at class level.
    """
    permission_classes = [IsDistributorAdmin]
    throttle_classes = [PartnerRateThrottle]

    @extend_schema(
        summary="Get Distributor Facilitation Trends",
        description="Returns month-on-month breakdown of customer conversions and corresponding commissions earned.",
        responses={
            200: {
                "type": "object",
                "properties": {
                    "trends": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "month": {"type": "string", "example": "2026-06"},
                                "count": {"type": "integer", "example": 145},
                                "commissions": {"type": "string", "example": "145000.00"}
                            }
                        }
                    }
                }
            },
            401: {"description": "Unauthorized access."},
            403: {"description": "Permission denied. Requires Distributor Admin privileges."}
        },
        tags=["Analytics - Distributor"]
    )
    def get(self, request):
        partner = get_partner_from_user(request.user)
        qs = PolicySubscription.objects.filter(distributor=partner)
        return Response({"trends": _monthly(qs, commissions=Sum("distributor_commission"))})
