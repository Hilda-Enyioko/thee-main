import type { ProductTerms } from '../../lib/types';
import { bpsToPctInput, pctToBps } from '../../lib/format';

export interface TermsDraft {
  durationMonths: string;
  summary: string;
  exclusions: string;     // one per line
  claimDocuments: string; // one per line
  excessPct: string;
  claimSlaHours: string;
}

export const emptyTerms: TermsDraft = {
  durationMonths: '12', summary: '', exclusions: '', claimDocuments: '', excessPct: '', claimSlaHours: '',
};

export const termsToDraft = (t: ProductTerms): TermsDraft => ({
  durationMonths: String(t.durationMonths ?? ''),
  summary: t.summary ?? '',
  exclusions: (t.exclusions ?? []).join('\n'),
  claimDocuments: (t.claimDocuments ?? []).join('\n'),
  excessPct: bpsToPctInput(t.excessBps),
  claimSlaHours: t.claimSlaHours ? String(t.claimSlaHours) : '',
});

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// Validates against the server's limits and builds the request object.
export function draftToTerms(d: TermsDraft): { terms?: ProductTerms; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const months = Number(d.durationMonths);
  if (!Number.isInteger(months) || months < 1 || months > 36) errors.durationMonths = 'Enter 1 to 36 months.';
  if (d.summary.length > 2000) errors.summary = 'Keep the summary under 2,000 characters.';
  const exclusions = lines(d.exclusions);
  if (exclusions.length > 50) errors.exclusions = 'Up to 50 exclusions.';
  if (exclusions.some((x) => x.length > 300)) errors.exclusions = 'Each exclusion must be under 300 characters.';
  const claimDocuments = lines(d.claimDocuments);
  if (claimDocuments.length > 30) errors.claimDocuments = 'Up to 30 documents.';
  if (claimDocuments.some((x) => x.length > 200)) errors.claimDocuments = 'Each item must be under 200 characters.';
  let excessBps: number | undefined;
  if (d.excessPct.trim()) {
    const v = pctToBps(d.excessPct);
    if (v === null) errors.excessPct = 'Enter a percentage from 0 to 100.'; else excessBps = v;
  }
  let claimSlaHours: number | undefined;
  if (d.claimSlaHours.trim()) {
    const v = Number(d.claimSlaHours);
    if (!Number.isInteger(v) || v < 1 || v > 720) errors.claimSlaHours = 'Enter 1 to 720 hours.'; else claimSlaHours = v;
  }
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    terms: {
      durationMonths: months,
      ...(d.summary.trim() ? { summary: d.summary.trim() } : {}),
      exclusions,
      claimDocuments,
      ...(excessBps !== undefined ? { excessBps } : {}),
      ...(claimSlaHours !== undefined ? { claimSlaHours } : {}),
    },
  };
}
