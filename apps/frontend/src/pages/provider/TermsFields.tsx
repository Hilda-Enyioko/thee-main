import type { TermsDraft } from './terms';
import { Field } from '../../components/ui';

export default function TermsFields({ value, onChange, errors, disabled }:
  { value: TermsDraft; onChange: (d: TermsDraft) => void; errors: Record<string, string>; disabled?: boolean }) {
  const set = (k: keyof TermsDraft) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="portal-form-grid">
      <Field label="Cover duration (months)" error={errors.durationMonths}>
        <input type="number" min={1} max={36} value={value.durationMonths} onChange={set('durationMonths')} disabled={disabled} />
      </Field>
      <Field label="Excess (%) · optional" error={errors.excessPct} hint="The share of each claim the customer pays">
        <input inputMode="decimal" value={value.excessPct} onChange={set('excessPct')} disabled={disabled} placeholder="5" />
      </Field>
      <Field label="Claim SLA (hours) · optional" error={errors.claimSlaHours} hint="How fast you commit to decide a claim">
        <input type="number" min={1} max={720} value={value.claimSlaHours} onChange={set('claimSlaHours')} disabled={disabled} placeholder="72" />
      </Field>
      <Field label="Summary · optional" error={errors.summary} full>
        <textarea rows={3} value={value.summary} onChange={set('summary')} disabled={disabled} maxLength={2000} placeholder="Comprehensive cover for private vehicles" />
      </Field>
      <Field label="Exclusions · one per line" error={errors.exclusions}>
        <textarea rows={5} value={value.exclusions} onChange={set('exclusions')} disabled={disabled} placeholder={'Racing\nDriving under the influence'} />
      </Field>
      <Field label="Claim documents · one per line" error={errors.claimDocuments} hint="Becomes the customer’s claim checklist">
        <textarea rows={5} value={value.claimDocuments} onChange={set('claimDocuments')} disabled={disabled} placeholder={'Police report\nRepair estimate'} />
      </Field>
    </div>
  );
}
