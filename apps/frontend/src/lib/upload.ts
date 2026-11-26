import { orgApi, type OrgKind } from './api';
import { KYC_MAX_BYTES } from '../config/kyc';
import type { KycDocKind } from './types';

const OK_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const OK_EXT = /\.(jpe?g|png|pdf)$/i;

// The browser-side copy of the server's rules: JPG, PNG or PDF, 5 MB max.
export function checkFile(file: File): string | null {
  if (!OK_TYPES.includes(file.type) && !OK_EXT.test(file.name)) return 'Only JPG, PNG or PDF files are accepted.';
  if (file.size > KYC_MAX_BYTES) return 'Files must be 5 MB or smaller.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

// Signs a ticket for this document kind, then sends the file straight to
// Cloudinary with every ticket field unchanged. Returns the publicId to submit.
export async function uploadKycFile(org: OrgKind, kind: KycDocKind, file: File): Promise<string> {
  const ticket = await orgApi.signUpload(org, kind);
  const form = new FormData();
  Object.entries(ticket.fields).forEach(([k, v]) => form.append(k, String(v)));
  form.append('file', file);

  const res = await fetch(ticket.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    let reason = '';
    try { reason = (await res.json())?.error?.message ?? ''; } catch { /* not JSON */ }
    throw new Error(reason ? `Upload failed: ${reason}` : 'Upload failed. Please try again.');
  }
  return String(ticket.fields.public_id);
}
