from django.urls import path
from .views import PaymentVerifyView, PaystackWebhookView, PayLinkView

app_name = "payments"

urlpatterns = [
    path("verify/<str:reference>/", PaymentVerifyView.as_view(), name="verify"),
    path("paystack/webhook/", PaystackWebhookView.as_view(), name="paystack-webhook"),
    path("link/<str:token>/", PayLinkView.as_view(), name="pay-link"),
]
