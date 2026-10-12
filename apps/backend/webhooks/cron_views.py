import hmac
from django.conf import settings
from django.core.management import call_command
from django.http import HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from webhooks.services import retry_due


def _validate_key(key):
    expected = getattr(settings, "CRON_SECRET_KEY", "")
    return bool(expected) and hmac.compare_digest(key, expected)


@csrf_exempt
def trigger_retry_due(request, secret_key):
    if not _validate_key(secret_key):
        return HttpResponseForbidden("Forbidden")

    try:
        count = retry_due()
        return JsonResponse({"status": "ok", "retried": count})
    except Exception as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=500)


@csrf_exempt
def trigger_renewal_reminders(request, secret_key):
    if not _validate_key(secret_key):
        return HttpResponseForbidden("Forbidden")

    try:
        call_command("send_renewal_reminders")
        return JsonResponse({"status": "ok"})
    except Exception as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=500)
