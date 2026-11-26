import type { ProductType } from '../generated/prisma/client';

export const MOTOR_CATEGORIES = ['PRIVATE', 'COMMERCIAL', 'MOTORCYCLE'] as const;
export const DEVICE_CATEGORIES = ['PHONE', 'LAPTOP', 'TABLET', 'OTHER'] as const;

export type Risk =
  | { productType: 'MOTOR'; vehicleCategory: (typeof MOTOR_CATEGORIES)[number]; vehicleValue: string; yearOfManufacture: number }
  | { productType: 'GADGET'; deviceCategory: (typeof DEVICE_CATEGORIES)[number]; deviceValue: string };

export type PricingRule =
  | { kind: 'FLAT'; premium: string }
  | { kind: 'PERCENT_OF_VALUE'; rateBps: number; min?: string; max?: string };

export interface QuoteRequest {
  product: { id: string; type: ProductType; code: string };
  plan: { id: string; name: string; coverAmount: string; pricingRule: PricingRule };
  durationMonths: number;
  risk: Risk;
}

export interface QuoteResult {
  currency: 'NGN';
  premium: string;
  coverAmount: string;
  durationMonths: number;
  validUntil: string;
  adapterRef: string;
}

// Phase 3 adds issue(); later phases add cancel and claim hooks.
export interface ProviderAdapter {
  readonly key: string;
  quote(req: QuoteRequest): Promise<QuoteResult>;
}

export const PROVIDER_ADAPTERS = Symbol('PROVIDER_ADAPTERS');
