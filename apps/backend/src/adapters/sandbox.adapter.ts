import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import type { ProviderAdapter, QuoteRequest, QuoteResult } from './provider-adapter';

const D = Prisma.Decimal;

@Injectable()
export class SandboxAdapter implements ProviderAdapter {
  readonly key = 'sandbox';

  async quote(req: QuoteRequest): Promise<QuoteResult> {
    const rule = req.plan.pricingRule;
    const insured = new D(req.risk.productType === 'MOTOR' ? req.risk.vehicleValue : req.risk.deviceValue);
    if (insured.lte(0)) throw new BadRequestException('Insured value must be greater than zero');

    let premium: Prisma.Decimal;
    if (rule.kind === 'FLAT') {
      premium = new D(rule.premium);
    } else {
      premium = insured.mul(rule.rateBps).div(10_000);
      if (rule.min) premium = D.max(premium, new D(rule.min));
      if (rule.max) premium = D.min(premium, new D(rule.max));
    }

    return {
      currency: 'NGN',
      premium: premium.toDecimalPlaces(2, D.ROUND_HALF_UP).toFixed(2),
      coverAmount: req.plan.coverAmount,
      durationMonths: req.durationMonths,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      adapterRef: `sandbox-${randomUUID()}`,
    };
  }
}
