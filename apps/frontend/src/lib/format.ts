import type { PricingRule } from './types';

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

// Money arrives as a decimal string. Format for display only; never do maths on it.
export const money = (v: string | null | undefined) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? naira.format(n) : v;
};

// Matches the server's money rule: up to 13 digits, up to 2 decimals.
export const MONEY_RE = /^\d{1,13}(\.\d{1,2})?$/;

// Normalises user input like "1,500,000" or "150000.5" to "1500000.00".
export function toMoney(input: string): string | null {
  const s = input.replace(/[,\s₦]/g, '');
  if (!MONEY_RE.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return `${whole}.${frac.padEnd(2, '0')}`;
}

// Basis points: 1500 = 15%.
export const pct = (bps: number | null | undefined) =>
  bps === null || bps === undefined ? '—' : `${(bps / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`;

// "15" or "15.5" (percent) → 1500 or 1550 bps. Returns null when out of range.
export function pctToBps(input: string, min = 0, max = 10000): number | null {
  const s = input.trim();
  if (s === '' || !/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const bps = Math.round(Number(s) * 100);
  return bps >= min && bps <= max ? bps : null;
}

export const bpsToPctInput = (bps: number | null | undefined) =>
  bps === null || bps === undefined ? '' : String(bps / 100);

export const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

// "UNDER_REVIEW" → "Under review"
export const label = (v: string | null | undefined) =>
  v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—';

export const bytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export const orgName = (o: { tradingName?: string | null; legalName: string }) => o.tradingName || o.legalName;

export const pricingText = (r: PricingRule) =>
  r.kind === 'FLAT'
    ? `${money(r.premium)} flat`
    : `${pct(r.rateBps)} of value${r.min ? ` · min ${money(r.min)}` : ''}${r.max ? ` · max ${money(r.max)}` : ''}`;
