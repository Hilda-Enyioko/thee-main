from django.utils import timezone
from payments.links import make_pay_link

def _core(claim):
    user = claim.customer.user
    return {
        "claim_id": str(claim.id),
        "claim_reference": claim.claim_reference,
        "claim_type": claim.claim_type,
        "status": claim.status,
        "customer": {"id": str(claim.customer_id), "email": user.email,
                     "first_name": user.first_name},
        "provider": {"id": str(claim.provider_id), "name": claim.provider.name,
                     "admin_emails": list(claim.provider.admins
                         .filter(user__is_active=True)
                         .values_list("user__email", flat=True))},
    }


def _payment(p):
    return {
        "reference": p.reference,
        "amount": str(p.amount),
        "status": p.status,
        "nomba_reference": p.nomba_reference,
        "failure_reason": p.failure_reason,
    }


def claim_submitted(claim):
    return {**_core(claim),
            "claimed_amount": str(claim.claimed_amount),
            "incident_date": claim.incident_date.isoformat()}


def claim_ai_check_requested(claim):
    plan = getattr(claim.subscription, "plan", None)
    return {**_core(claim),
            "subscription": {"id": str(claim.subscription_id)},
            "plan": ({"id": str(plan.id), "name": plan.name,
                      "coverage_level": plan.coverage_level,
                      "coverage_amount": str(plan.coverage_amount),
                      "premium": str(plan.premium),
                      "duration_months": plan.duration_months} if plan else None),
            "claimed_amount": str(claim.claimed_amount),
            "incident_date": claim.incident_date.isoformat(),
            "incident_description": claim.incident_description,
            "documents": [{"type": d.document_type, "url": d.file.url}
                          for d in claim.documents.all()]}


def claim_ai_checked(claim):
    return {**_core(claim), "ai": claim.ai_result}


claim_flagged = claim_ai_checked


def claim_forwarded(claim):
    return {**_core(claim),
            "claimed_amount": str(claim.claimed_amount),
            "provider_id": str(claim.provider_id)}


def provider_claim_decision(claim, decision):
    return {**_core(claim), "decision": decision}


def claim_approved(claim):
    return {**_core(claim), "approved_amount": str(claim.approved_amount)}


def claim_rejected(claim):
    return {**_core(claim),
            "reason": claim.provider_review_note or claim.theeinsurance_review_note}


def claim_status_updated(claim):   # legacy partner event
    return {**_core(claim),
            "customer_email": claim.customer.user.email,
            "approved_amount": str(claim.approved_amount) if claim.approved_amount is not None else None}


def payment_event(claim, payment):  # initiated / completed / failed
    return {**_core(claim), "payment": _payment(payment)}


def receipt_generated(claim, payment):
    return {**_core(claim),
            "receipt": {"url": payment.receipt_url, "payment_reference": payment.reference}}


def claim_parties_notified(claim):
    return _core(claim)


def _sub_core(sub):
    c, plan, partner = sub.customer, sub.plan, sub.customer.partner
    return {
        "subscription_id": str(sub.id),
        "customer": {"id": str(c.id), "external_id": c.external_id, "email": c.email,
                     "first_name": c.first_name, "last_name": c.last_name},
        "plan": {"id": str(plan.id), "name": plan.name, "category": plan.category.get_name_display(),
                 "coverage_level": plan.get_coverage_level_display(), "duration_months": plan.duration_months},
        "amount": str(sub.amount_paid), "currency": "NGN",
        "start_date": sub.start_date.isoformat(), "end_date": sub.end_date.isoformat(),
        "provider": {"id": str(sub.provider_id), "name": sub.provider.name},
        "distributor": ({"id": str(sub.distributor_id), "name": sub.distributor.name}
                        if sub.distributor_id else None),
        "partner": {"id": str(partner.id), "name": partner.name},   # the brand the customer knows
    }


def _sub_payment(txn):
    return {"reference": txn.reference, "amount": str(txn.amount), "currency": txn.currency,
            "type": txn.payment_type.lower(),                       # new_subscription | renewal
            "paid_at": (txn.gateway_response or {}).get("paid_at")}


def subscription_payment_succeeded(sub, txn):
    return {**_sub_core(sub), "payment": _sub_payment(txn)}


def subscription_payment_failed(sub, txn, reason):
    return {**_sub_core(sub), "payment": _sub_payment(txn), "reason": reason,
            "action_url": make_pay_link(sub, txn.payment_type)}


def subscription_renewal_due(sub, days_left, window):
    return {**_sub_core(sub), "days_left": days_left, "window": window,
            "action_url": make_pay_link(sub, "RENEWAL")}


def _age(dob):
    if not dob:
        return None
    t = timezone.localdate()
    return t.year - dob.year - ((t.month, t.day) < (dob.month, dob.day))


def recommendation_requested(rec):
    c = rec.customer
    return {"request_id": str(rec.id),
            "partner": {"id": str(rec.partner_id), "name": rec.partner.name},
            "customer": {"external_id": c.external_id, "age": _age(c.date_of_birth),
                         "gender": c.gender, "extra_data": c.extra_data},
            "criteria": rec.criteria}


def recommendation_ready(rec):
    return {"request_id": str(rec.id), "status": rec.status,
            "customer": {"external_id": rec.customer.external_id},
            "recommendations": rec.results, "summary": rec.summary,
            "failure_reason": rec.failure_reason}
