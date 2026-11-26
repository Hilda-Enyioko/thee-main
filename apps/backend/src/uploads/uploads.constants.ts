export const KYC_DOCUMENT_KINDS = [
  'CAC_CERTIFICATE', 'TAX_CLEARANCE', 'DIRECTOR_ID', 'PROOF_OF_ADDRESS', 'OPERATING_LICENCE', 'OTHER',
] as const;
export type KycDocumentKind = (typeof KYC_DOCUMENT_KINDS)[number];

export const REQUIRED_KYC_KINDS: readonly KycDocumentKind[] = ['CAC_CERTIFICATE'];

export const KYC_ALLOWED_FORMATS = ['jpg', 'png', 'pdf'] as const;
export const KYC_MAX_BYTES = 5 * 1024 * 1024;
export const DOWNLOAD_URL_TTL_SECONDS = 300;
