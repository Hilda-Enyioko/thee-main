from django.urls import path
from .views import ServiceWebhookRegisterView
from .cron_views import (
    trigger_retry_due,
    trigger_renewal_reminders,
)

urlpatterns = [
    path("service/register/", ServiceWebhookRegisterView.as_view(), name="service-webhook-register"),
    path("internal/cron/retry-due/", trigger_retry_due, name="cron_retry_due"),
    path("internal/cron/renewal-reminders/", trigger_renewal_reminders, name="cron_renewal_reminders"),
]
