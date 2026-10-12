from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from subscriptions.models import PolicySubscription
from webhooks import builders as b
from webhooks.events import E
from webhooks.services import emit

WINDOWS = (1, 7, 30)


def window_for(days_left):
    return next(w for w in WINDOWS if days_left <= w)


class Command(BaseCommand):
    help = "Emit subscription.renewal_due for active subscriptions ending within 30 days (once per window)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, dry_run=False, **options):
        today = timezone.localdate()
        qs = (PolicySubscription.objects
              .filter(status="active", end_date__gte=today, end_date__lte=today + timedelta(days=max(WINDOWS)))
              .select_related("customer__partner", "plan__category", "provider", "distributor"))
        checked = skipped = 0
        for sub in qs.iterator():
            if not sub.customer.consent_obtained:
                skipped += 1
                continue
            days_left = (sub.end_date - today).days
            window = window_for(days_left)
            checked += 1
            if dry_run:
                continue
            with transaction.atomic():
                emit(E.SUBSCRIPTION_RENEWAL_DUE, partner=sub.customer.partner, aggregate_id=sub.id,
                     data=b.subscription_renewal_due(sub, days_left, window),
                     discriminator=f"{sub.end_date.isoformat()}:{window}")
        self.stdout.write(f"{checked} due, {skipped} skipped (no consent){' [dry run]' if dry_run else ''}.")
