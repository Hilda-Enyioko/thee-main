import logging
import resend
from django.conf import settings
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.utils.html import escape

log = logging.getLogger(__name__)


def _partner_admin_emails(partner):
    from .models import PartnerAdmin
    return list(
        PartnerAdmin.objects.filter(partner=partner, role="partner_admin", user__is_active=True)
        .values_list("user__email", flat=True)
    )


def _send(to, subject, html):
    if not to:
        return
    if not settings.RESEND_API_KEY:
        log.warning("RESEND_API_KEY not set; skipping email '%s' to %s", subject, to)
        return
    resend.api_key = settings.RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": to,
            "subject": subject,
            "html": html,
        })
    except Exception:
        log.exception("Resend failed for '%s'", subject)  # never break the request over email


def _after_commit(fn, *args):
    transaction.on_commit(lambda: fn(*args))


def on_commit_send(fn, *args):
    _after_commit(fn, *args)


def send_kyc_received(partner):
    _send(
        _partner_admin_emails(partner),
        "We've received your KYC",
        f"<p>Hi,</p><p>Thanks for submitting KYC for <b>{partner.name}</b>. "
        "Our team is reviewing it and we'll email you as soon as it's verified.</p>",
    )


def send_kyc_approved(partner):
    _send(
        _partner_admin_emails(partner),
        "Your account is verified",
        f"<p>Good news, <b>{partner.name}</b> has been verified.</p>"
        "<p>Your <b>X-Partner-Key</b> is now active. Use the key issued when you signed up. "
        "If you've lost it, log in and regenerate it from your dashboard.</p>"
        "<p>You can now log in and complete your profile.</p>",
    )


def send_kyc_rejected(partner, note):
    _send(
        _partner_admin_emails(partner),
        "Your KYC needs attention",
        f"<p>We couldn't verify <b>{partner.name}</b>.</p><p>Reason: {note}</p>"
        "<p>Please log in and resubmit your documents.</p>",
    )


def _naira(value):
    return f"₦{value:,.2f}"


def _has_settlement(partner):
    try:
        profile = (
            partner.distributor_profile
            if partner.partner_type == "distributor"
            else partner.provider_profile
        )
    except ObjectDoesNotExist:
        return False
    return bool(
        profile.settlement_account_name
        and profile.settlement_bank_account
        and profile.settlement_bank_code
    )


def _settlement_note(partner):
    if _has_settlement(partner):
        return "<p>You will be settled shortly to your registered settlement account.</p>"
    return (
        "<p>You will be settled shortly, but we don't have your settlement bank details yet. "
        "Please log in, open your profile and add your settlement account (account name, number and bank) "
        "so we can pay out your share.</p>"
    )


def send_payment_emails(txn_id):
    """Provider notice + distributor notice (if one is involved) + optional customer receipt."""
    from payments.models import Transaction

    txn = (
        Transaction.objects
        .select_related(
            "subscription__plan",
            "subscription__provider",
            "subscription__distributor",
            "subscription__customer",
        )
        .filter(pk=txn_id)
        .first()
    )
    if txn is None:
        return

    sub = txn.subscription
    plan, customer = sub.plan, sub.customer
    kind = "renewal" if txn.payment_type == "RENEWAL" else "purchase"
    plan_name, ref = escape(plan.name), escape(txn.reference)

    # NOTE: Comment out or remove this block if customer communication is handled 
    # via n8n / partner webhooks (subscription.created) to avoid double-emailing 
    # or confusing partner-acquired customers with TheeInsurance branding.
    _send(
        [customer.email],
        f"Payment received: {plan.name}",
        f"<p>Hi {escape(customer.first_name)},</p>"
        f"<p>We've received your payment of <b>{_naira(txn.amount)}</b> for <b>{plan_name}</b> ({kind}).</p>"
        f"<p>Coverage: {sub.start_date} to {sub.end_date}<br>Reference: {ref}</p>",
    )

    _send(
        _partner_admin_emails(sub.provider),
        f"New paid {kind}: {plan.name}",
        f"<p>A customer {kind} of <b>{plan_name}</b> has been paid (ref {ref}).</p>"
        f"<p>Your share: <b>{_naira(sub.provider_payout)}</b></p>"
        f"{_settlement_note(sub.provider)}",
    )

    if sub.distributor:
        _send(
            _partner_admin_emails(sub.distributor),
            f"New paid {kind}: {plan.name}",
            f"<p>A customer {kind} of <b>{plan_name}</b> through your platform has been paid (ref {ref}).</p>"
            f"<p>Your commission: <b>{_naira(sub.distributor_commission)}</b></p>"
            f"{_settlement_note(sub.distributor)}",
        )
