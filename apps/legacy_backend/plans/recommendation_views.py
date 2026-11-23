from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers as s
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Customer
from accounts.permissions import IsServiceAccount
from core.api import PartnerKeyAPIView, idempotency_key
from core.docs import PARTNER_KEY_AUTH, Tag
from core.idempotency import process_idempotent_request
from core.throttles import PartnerRateThrottle
from webhooks import builders as b
from webhooks.events import E
from webhooks.services import emit

from .models import PlanRecommendation
from .selectors import plans_visible_to_partner


class RecommendationRequestSerializer(s.Serializer):
    category = s.CharField(required=False)
    coverage_level = s.CharField(required=False)
    budget = s.DecimalField(max_digits=12, decimal_places=2, required=False, min_value=0)
    notes = s.CharField(required=False, max_length=1000, allow_blank=True)


class _Item(s.Serializer):
    plan_id = s.UUIDField()
    reason = s.CharField(max_length=500)


class RecommendationResultSerializer(s.Serializer):
    status = s.ChoiceField(choices=["ready", "failed"], default="ready")
    recommendations = _Item(many=True, required=False)
    summary = s.CharField(max_length=2000, required=False, allow_blank=True, default="")
    failure_reason = s.CharField(max_length=500, required=False, allow_blank=True, default="")

    def validate(self, attrs):
        recs = attrs.get("recommendations", [])
        if attrs["status"] == "ready" and not recs:
            raise s.ValidationError({"recommendations": ["At least one plan is required when status is ready."]})
        if len(recs) > 5:
            raise s.ValidationError({"recommendations": ["At most 5 plans."]})
        if len({r["plan_id"] for r in recs}) != len(recs):
            raise s.ValidationError({"recommendations": ["Duplicate plan_id."]})
        return attrs


def _view(rec):
    return {"id": str(rec.id), "status": rec.status, "criteria": rec.criteria,
            "recommendations": rec.results, "summary": rec.summary,
            "failure_reason": rec.failure_reason, "created_at": rec.created_at,
            "completed_at": rec.completed_at}


class CustomerRecommendationCreateView(PartnerKeyAPIView):
    @extend_schema(
        operation_id="customer_recommendation_create",
        summary="Ask for plan recommendations for a customer",
        description="Returns **202** immediately. The result arrives as a `recommendation.ready` webhook "
                    "and via `GET /customers/{external_id}/recommendations/{id}/`. Needs consent on record. "
                    "Send an `Idempotency-Key` to make retries safe.",
        auth=PARTNER_KEY_AUTH, request=RecommendationRequestSerializer, tags=[Tag.PLANS])
    def post(self, request, external_id):
        customer = Customer.objects.filter(partner=request.partner, external_id=external_id).first()
        if customer is None:
            return Response({"error": "Customer not found.", "code": "customer_not_found"}, status=404)
        if not customer.consent_obtained:
            return Response({"error": "Customer consent must be on record.", "code": "consent_required"}, status=422)
        ser = RecommendationRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        criteria = {k: str(v) for k, v in ser.validated_data.items()}

        def run():
            with transaction.atomic():
                rec = PlanRecommendation.objects.create(partner=request.partner, customer=customer, criteria=criteria)
                emit(E.RECOMMENDATION_REQUESTED, partner=request.partner, aggregate_id=rec.id,
                     data=b.recommendation_requested(rec))
            return Response({"id": str(rec.id), "status": rec.status}, status=202)

        return process_idempotent_request(request.partner, request, idempotency_key(request), request.data, run)


class CustomerRecommendationDetailView(PartnerKeyAPIView):
    @extend_schema(operation_id="customer_recommendation_retrieve", summary="Get a recommendation result",
                   auth=PARTNER_KEY_AUTH, tags=[Tag.PLANS])
    def get(self, request, external_id, request_id):
        rec = PlanRecommendation.objects.filter(
            id=request_id, partner=request.partner, customer__external_id=external_id).first()
        if rec is None:
            return Response({"error": "Recommendation not found."}, status=404)
        return Response(_view(rec))


class ServiceRecommendationResultView(APIView):
    permission_classes = [IsServiceAccount]
    throttle_classes = [PartnerRateThrottle]

    @extend_schema(summary="AI engine: submit the recommendation result", tags=[Tag.PLANS])
    def post(self, request, request_id):
        ser = RecommendationResultSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        with transaction.atomic():
            rec = (PlanRecommendation.objects.select_for_update(of=("self",))
                   .select_related("partner", "customer").filter(id=request_id).first())
            if rec is None:
                return Response({"error": "Recommendation not found."}, status=404)
            if rec.status != PlanRecommendation.PENDING:
                return Response({"error": "Already completed.", "code": "already_completed"}, status=409)

            ids = [r["plan_id"] for r in d.get("recommendations", [])]
            plans = {p.id: p for p in plans_visible_to_partner(rec.partner)
                     .filter(id__in=ids).select_related("provider")}
            bad = [str(i) for i in ids if i not in plans]
            if bad:
                return Response({"error": "Plans not available to this partner.", "plan_ids": bad}, status=400)

            rec.status = d["status"]
            rec.results = [{"rank": n, "plan_id": str(r["plan_id"]), "plan_name": plans[r["plan_id"]].name,
                            "provider_name": plans[r["plan_id"]].provider.name,
                            "premium": str(plans[r["plan_id"]].premium), "reason": r["reason"]}
                           for n, r in enumerate(d.get("recommendations", []), start=1)]
            rec.summary, rec.failure_reason, rec.completed_at = d["summary"], d["failure_reason"], timezone.now()
            rec.save()
            emit(E.RECOMMENDATION_READY, partner=rec.partner, aggregate_id=rec.id, data=b.recommendation_ready(rec))
        return Response(_view(rec))
