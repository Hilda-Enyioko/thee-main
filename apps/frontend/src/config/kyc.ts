import type { KycDocKind } from '../lib/types';

// The KYC form is built from this file. `details` is free-form on the server
// for now, so when Nedu's KYC checklist is final, change the fields here and
// the form follows. Keys become the keys of the submitted `details` object.

export interface KycDetailField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  // 'list' fields are typed comma-separated and submitted as string arrays.
  type?: 'text' | 'list' | 'textarea';
}

export const KYC_DETAIL_FIELDS: KycDetailField[] = [
  { key: 'cacNumber', label: 'CAC registration number', required: true, hint: 'Usually your RC number' },
  { key: 'tin', label: 'Tax identification number (TIN)' },
  { key: 'directors', label: 'Directors', type: 'list', required: true, hint: 'Full names, separated by commas' },
  { key: 'contactPerson', label: 'Compliance contact', hint: 'Who should we reach about this review?' },
  { key: 'notes', label: 'Anything else we should know', type: 'textarea' },
];

export const KYC_DOC_LABELS: Record<KycDocKind, string> = {
  CAC_CERTIFICATE: 'CAC certificate',
  TAX_CLEARANCE: 'Tax clearance',
  DIRECTOR_ID: 'Director ID',
  PROOF_OF_ADDRESS: 'Proof of address',
  OPERATING_LICENCE: 'Operating licence',
  OTHER: 'Other document',
};

// Documents shown as their own rows on the form. CAC is required by the server.
export const KYC_SUGGESTED_DOCS: { kind: KycDocKind; required?: boolean }[] = [
  { kind: 'CAC_CERTIFICATE', required: true },
  { kind: 'DIRECTOR_ID' },
  { kind: 'TAX_CLEARANCE' },
  { kind: 'PROOF_OF_ADDRESS' },
  { kind: 'OPERATING_LICENCE' },
];

export const KYC_MAX_DOCS = 15;
export const KYC_MAX_BYTES = 5 * 1024 * 1024;
export const KYC_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';
