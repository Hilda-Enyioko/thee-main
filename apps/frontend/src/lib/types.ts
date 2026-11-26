// Response and request shapes from the Phase 1 frontend handoff. Swagger does
// not annotate responses yet, so these are typed by hand from the handoff.

export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number }

export interface Paginated<T> { total: number; page: number; limit: number; items: T[] }

export type OrgStatus = 'PENDING_KYC' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type DistributorType = 'DEALER_SHOP' | 'API_PARTNER';
export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED';
export type StaffRole = 'SUPER_ADMIN' | 'ADMIN' | 'KYC_REVIEWER' | 'SUPPORT';
export type OrgRole = 'ADMIN' | 'MEMBER';
export type KycDocKind =
  | 'CAC_CERTIFICATE' | 'TAX_CLEARANCE' | 'DIRECTOR_ID' | 'PROOF_OF_ADDRESS' | 'OPERATING_LICENCE' | 'OTHER';
export type ProductType = 'MOTOR' | 'GADGET';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type GrantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
export type KycStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Settlement { bankName: string; accountName: string; accountNumberLast4: string }

export interface OrgView {
  id: string;
  legalName: string;
  tradingName: string | null;
  rcNumber: string;
  email: string;
  phone: string;
  address: string | null;
  status: OrgStatus;
  settlement: Settlement | null;
  createdAt: string;
  // distributors only
  type?: DistributorType;
  city?: string | null;
}

export interface OrgMe extends OrgView {
  latestKyc: { status: KycStatus; reviewNote: string | null; reviewedAt: string | null } | null;
}

export interface KycDocument { kind: KycDocKind; publicId: string; format: string; bytes: number }

export interface OrgForReview extends OrgView {
  latestKyc: {
    id: string;
    status: KycStatus;
    details: Record<string, unknown>;
    documents: KycDocument[];
    submittedAt: string;
  } | null;
}

export interface OnboardBody {
  legalName: string;
  tradingName?: string;
  rcNumber: string;
  email: string;
  phone: string;
  address?: string;
  admin: { fullName: string; email: string; password: string };
  type?: DistributorType;
  city?: string;
}

export interface ProfileBody {
  tradingName?: string;
  phone?: string;
  address?: string;
  settlement?: { bankName: string; accountNumber: string; accountName: string };
}

export interface UploadTicket {
  uploadUrl: string;
  fields: Record<string, string | number>;
  expiresAt: string;
}

export interface Member {
  id: string;
  email: string;
  fullName: string;
  role: OrgRole;
  status: UserStatus;
  createdAt: string;
}

export interface StaffAccount {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  status: UserStatus;
  createdAt: string;
}

export interface ProductTerms {
  durationMonths: number;
  summary?: string;
  exclusions?: string[];
  claimDocuments?: string[];
  excessBps?: number;
  claimSlaHours?: number;
}

export type PricingRule =
  | { kind: 'FLAT'; premium: string }
  | { kind: 'PERCENT_OF_VALUE'; rateBps: number; min?: string; max?: string };

export interface Plan {
  id: string;
  name: string;
  coverAmount: string;
  pricingRule: PricingRule;
  installmentsOk: boolean;
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  type: ProductType;
  code: string;
  name: string;
  status: ProductStatus;
  terms: ProductTerms;
  defaultCommissionBps: number | null;
  plans: Plan[];
  createdAt: string;
}

export interface CreateProductBody {
  type: ProductType;
  code: string;
  name: string;
  defaultCommissionBps?: number;
  terms: ProductTerms;
}

export interface UpdateProductBody {
  name?: string;
  defaultCommissionBps?: number;
  terms?: ProductTerms;
  status?: ProductStatus;
}

export interface CreatePlanBody {
  name: string;
  coverAmount: string;
  installmentsOk?: boolean;
  pricingRule: PricingRule;
}

export type MotorRisk = { vehicleCategory: 'PRIVATE' | 'COMMERCIAL' | 'MOTORCYCLE'; vehicleValue: string; yearOfManufacture: number };
export type GadgetRisk = { deviceCategory: 'PHONE' | 'LAPTOP' | 'TABLET' | 'OTHER'; deviceValue: string };

export interface Quote {
  productId: string;
  planId: string;
  adapterKey: string;
  currency: string;
  premium: string;
  coverAmount: string;
  durationMonths: number;
  validUntil: string;
  adapterRef: string;
}

export interface Grant {
  id: string;
  status: GrantStatus;
  commissionBps: number | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  product: { id: string; name: string; type: ProductType };
  provider?: { id: string; name: string };
  distributor?: { id: string; name: string; type: DistributorType; city: string | null };
}

export interface CatalogueItem {
  id: string;
  type: ProductType;
  code: string;
  name: string;
  provider: { id: string; name: string };
  accessStatus: GrantStatus | null;
}
