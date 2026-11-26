import { http } from './http';
import type {
  CatalogueItem, CreatePlanBody, CreateProductBody, GadgetRisk, Grant, GrantStatus, KycDocKind, Member,
  MotorRisk, OnboardBody, OrgForReview, OrgMe, OrgRole, OrgStatus, OrgView, Paginated, Plan, Product,
  ProfileBody, Quote, StaffAccount, StaffRole, TokenPair, UploadTicket, UpdateProductBody, UserStatus,
} from './types';
import type { Kind } from './session';

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export type OrgKind = Exclude<Kind, 'staff'>;
const base = (k: OrgKind) => (k === 'provider' ? '/providers' : '/distributors');

export interface PageQuery { page?: number; limit?: number }

export const authApi = {
  login: (kind: Kind, email: string, password: string) =>
    data(http.post<TokenPair>(`/auth/${kind}/login`, { email, password })),
};

// Endpoints providers and distributors share, under their own path prefix.
export const orgApi = {
  onboard: (k: OrgKind, body: OnboardBody) => data(http.post<OrgView>(`${base(k)}/onboard`, body)),
  me: (k: OrgKind) => data(http.get<OrgMe>(`${base(k)}/me`)),
  signUpload: (k: OrgKind, kind: KycDocKind) =>
    data(http.post<UploadTicket>(`${base(k)}/uploads/sign`, { kind })),
  submitKyc: (k: OrgKind, body: { details: Record<string, unknown>; documents: { kind: KycDocKind; publicId: string }[] }) =>
    data(http.post<{ status: OrgStatus }>(`${base(k)}/kyc`, body)),
  updateProfile: (k: OrgKind, body: ProfileBody) => data(http.patch<OrgView>(`${base(k)}/profile`, body)),
  team: (k: OrgKind) => data(http.get<Member[]>(`${base(k)}/team`)),
  addMember: (k: OrgKind, body: { fullName: string; email: string; password: string; role: OrgRole }) =>
    data(http.post<Member>(`${base(k)}/team`, body)),
  deactivate: (k: OrgKind, id: string) => data(http.post<Member>(`${base(k)}/team/${id}/deactivate`)),
  reactivate: (k: OrgKind, id: string) => data(http.post<Member>(`${base(k)}/team/${id}/reactivate`)),
};

export const providerApi = {
  products: () => data(http.get<Product[]>('/providers/products')),
  product: (id: string) => data(http.get<Product>(`/providers/products/${id}`)),
  createProduct: (body: CreateProductBody) => data(http.post<Product>('/providers/products', body)),
  updateProduct: (id: string, body: UpdateProductBody) => data(http.patch<Product>(`/providers/products/${id}`, body)),
  addPlan: (id: string, body: CreatePlanBody) => data(http.post<Plan>(`/providers/products/${id}/plans`, body)),
  setPlanActive: (id: string, planId: string, active: boolean) =>
    data(http.patch<Plan>(`/providers/products/${id}/plans/${planId}`, { active })),
  quote: (id: string, planId: string, risk: MotorRisk | GadgetRisk) =>
    data(http.post<Quote>(`/providers/products/${id}/plans/${planId}/quote`, { risk })),
  accessRequests: (q: PageQuery & { status?: GrantStatus }) =>
    data(http.get<Paginated<Grant>>('/providers/access-requests', { params: clean(q) })),
  reviewAccess: (id: string, body: { decision: 'APPROVED' | 'REJECTED'; commissionBps?: number; note?: string }) =>
    data(http.patch<Grant>(`/providers/access-requests/${id}`, body)),
  revokeAccess: (id: string, note: string) =>
    data(http.post<Grant>(`/providers/access-requests/${id}/revoke`, { note })),
};

export const distributorApi = {
  catalogue: () => data(http.get<CatalogueItem[]>('/distributors/catalogue')),
  requestAccess: (productId: string) => data(http.post<Grant>('/distributors/access-requests', { productId })),
  accessRequests: (q: PageQuery & { status?: GrantStatus }) =>
    data(http.get<Paginated<Grant>>('/distributors/access-requests', { params: clean(q) })),
};

export type ReviewTarget = 'providers' | 'distributors';

export const staffApi = {
  kycQueue: (t: ReviewTarget, q: PageQuery & { status?: OrgStatus }) =>
    data(http.get<Paginated<OrgForReview>>(`/staff/kyc/${t}`, { params: clean(q) })),
  decideKyc: (t: ReviewTarget, id: string, body: { decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
    data(http.patch<OrgView>(`/staff/kyc/${t}/${id}`, body)),
  documentUrl: (publicId: string, format: string) =>
    data(http.get<{ url: string; expiresAt: string }>('/staff/kyc/documents/url', { params: { publicId, format } })),
  grants: (q: PageQuery & { status?: GrantStatus; providerId?: string; distributorId?: string }) =>
    data(http.get<Paginated<Grant>>('/staff/distributor-access', { params: clean(q) })),
  revokeGrant: (id: string, note: string) => data(http.post<Grant>(`/staff/distributor-access/${id}/revoke`, { note })),
  accounts: () => data(http.get<StaffAccount[]>('/staff/accounts')),
  createAccount: (body: { email: string; fullName: string; password: string; role: StaffRole }) =>
    data(http.post<StaffAccount>('/staff/accounts', body)),
  setAccountStatus: (id: string, status: UserStatus) =>
    data(http.patch<StaffAccount>(`/staff/accounts/${id}/status`, { status })),
};

// Query params: drop empty values so the server's strict validation never
// sees an empty string for an enum or UUID filter.
export function clean<T extends object>(q: T): T {
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as T;
}
