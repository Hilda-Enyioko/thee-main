from django.conf import settings
from django.core import signing

SALT = "payments.pay-link"
MAX_AGE_SECONDS = 30 * 24 * 3600


def make_pay_link(sub, payment_type):
    token = signing.dumps({"s": str(sub.id), "p": payment_type}, salt=SALT)
    return f"{settings.PUBLIC_API_BASE_URL.rstrip('/')}/api/v1/payments/link/{token}/"


def read_pay_link(token):
    return signing.loads(token, salt=SALT, max_age=MAX_AGE_SECONDS)
