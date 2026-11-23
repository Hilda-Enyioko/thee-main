import re

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema
from rest_framework import serializers as s
from rest_framework.response import Response
from rest_framework.views import APIView

from core.docs import PARTNER_KEY_AUTH, Tag, error, validation_error
from core.idempotency import process_idempotent_request
from core.throttles import PartnerRateThrottle

from .customer_serializers import CustomerSerializer, CustomerUpsertSerializer
from .customer_services import upsert_customer
from .models import Customer
from .permissions import IsPartnerKey

EXTERNAL_ID_RE = re.compile(r"^[A-Za-z0-9_.:@+\-]{1,255}$")
IDEMPOTENCY_HEADER = OpenApiParameter(
    "Idempotency-Key", OpenApiTypes.STR, OpenApiParameter.HEADER, required=False,
    description="Unique string per logical request (max 255 chars). Retrying with the same key and body returns the "
                "original response with `Idempotent-Replayed: true`; the same key with a different body returns 409.")


def _check_external_id(value):
    if not EXTERNAL_ID_RE.match(value):
        raise s.ValidationError({"external_id": ["1-255 chars: letters, digits and _ . : @ + - only."]})


def _idempotency_key(request):
    key = request.headers.get("Idempotency-Key", "").strip()
    if len(key) > 255:
        raise s.ValidationError({"Idempotency-Key": ["Must be 255 characters or fewer."]})
    return key or None


class CustomerDetailView(APIView):
    authentication_classes = []            # X-Partner-Key only; ignore any Authorization header
    permission_classes = [IsPartnerKey]
    throttle_classes = [PartnerRateThrottle]

    @extend_schema(
        operation_id="customer_upsert",
        summary="Create or update a customer (upsert)",
        description=(
            "Push a customer you already hold. `external_id` is **your** ID for them: the first call creates "
            "the record (**201**), later calls merge into it (**200**) and omitted fields are left unchanged. "
            "Customers never register with TheeInsurance.\n\n"
            "On create you must send `first_name`, `last_name`, `email` and `consent.obtained = true` "
            "(you confirm the customer consented to their data being shared with TheeInsurance and the provider). "
            "Every consent assertion is written to an append-only audit log. Send `consent.obtained = false` to record a withdrawal.\n\n"
            "`kyc` is **your** attestation that you verified the customer. TheeInsurance stores it and does not verify it."),
        auth=PARTNER_KEY_AUTH, parameters=[IDEMPOTENCY_HEADER], request=CustomerUpsertSerializer,
        responses={201: CustomerSerializer, 200: CustomerSerializer,
                   400: validation_error("consent", "Customer consent must be confirmed (true) to create a customer."),
                   409: error("Idempotency key reused with a different body.",
                              "Idempotency key reused with different request payload.")},
        examples=[OpenApiExample("Create", request_only=True, value={
            "first_name": "Chidi", "last_name": "Okafor", "email": "chidi@example.com", "phone_number": "+2348012345678",
            "date_of_birth": "1990-05-14", "gender": "male", "id_type": "nin", "id_number": "12345678901",
            "kyc": {"status": "verified", "method": "nin_lookup", "verified_at": "2026-10-01T09:00:00Z"},
            "consent": {"obtained": True, "obtained_at": "2026-10-01T09:02:00Z", "reference": "CONSENT-8841"}})],
        tags=[Tag.CUSTOMERS],
    )
    def put(self, request, external_id):
        _check_external_id(external_id)
        partner = request.partner
        existing = Customer.objects.filter(partner=partner, external_id=external_id).first()
        ser = CustomerUpsertSerializer(data=request.data, partial=existing is not None,
                                       context={"existing": existing})
        ser.is_valid(raise_exception=True)
        data, ip = ser.validated_data, request.META.get("REMOTE_ADDR")

        def run():
            customer, created = upsert_customer(partner, external_id, data, ip_address=ip)
            return Response(CustomerSerializer(customer).data, status=201 if created else 200)

        return process_idempotent_request(partner, request, _idempotency_key(request), request.data, run)

    @extend_schema(
        operation_id="customer_retrieve", summary="Get one of your customers", auth=PARTNER_KEY_AUTH,
        responses={200: CustomerSerializer, 404: error("Unknown external_id for this partner.", "Customer not found.")},
        tags=[Tag.CUSTOMERS],
    )
    def get(self, request, external_id):
        customer = Customer.objects.filter(partner=request.partner, external_id=external_id).first()
        if customer is None:
            return Response({"error": "Customer not found."}, status=404)
        return Response(CustomerSerializer(customer).data)


class CustomerListView(APIView):
    authentication_classes = []
    permission_classes = [IsPartnerKey]
    throttle_classes = [PartnerRateThrottle]

    @extend_schema(
        operation_id="customer_list", summary="List your customers", auth=PARTNER_KEY_AUTH,
        parameters=[OpenApiParameter("email", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Exact, case-insensitive."),
                    OpenApiParameter("kyc_status", OpenApiTypes.STR, OpenApiParameter.QUERY,
                                     enum=["verified", "unverified", "not_provided"]),
                    OpenApiParameter("page", OpenApiTypes.INT, OpenApiParameter.QUERY),
                    OpenApiParameter("page_size", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Max 100.")],
        responses={200: CustomerSerializer(many=True)},
        tags=[Tag.CUSTOMERS],
    )
    def get(self, request):
        qs = Customer.objects.filter(partner=request.partner).order_by("-created_at", "id")
        if v := request.query_params.get("email"):
            qs = qs.filter(email__iexact=v)
        if v := request.query_params.get("kyc_status"):
            qs = qs.filter(kyc_status=v)
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
            size = min(max(int(request.query_params.get("page_size", 20)), 1), 100)
        except ValueError:
            raise s.ValidationError({"page": ["page and page_size must be integers."]})
        items = qs[(page - 1) * size: page * size]
        return Response({"count": qs.count(), "page": page, "page_size": size,
                         "customers": CustomerSerializer(items, many=True).data})
