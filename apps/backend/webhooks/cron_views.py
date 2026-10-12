import hmac
from django.conf import settings
from django.core.management import call_command
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from webhooks.services import retry_due


def _is_authorized(request):
    auth_header = request.headers.get("Authorization", "")
    expected = f"Bearer {getattr(settings, 'CRON_TRIGGER_SECRET', '')}"
    # Use compare_digest to prevent timing attacks
    return bool(settings.CRON_TRIGGER_SECRET) and hmac.compare_digest(auth_header, expected)


@csrf_exempt
@require_POST
def trigger_retry_due(request):
    if not _is_authorized(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        count = retry_due()
        return JsonResponse({"status": "ok", "retried": count})
    except Exception as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=500)


@csrf_exempt
@require_POST
def trigger_renewal_reminders(request):
    if not _is_authorized(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        call_command("send_renewal_reminders")
        return JsonResponse({"status": "ok"})
    except Exception as exc:
        return JsonResponse({"status": "error", "message": str(exc)}, status=500)
