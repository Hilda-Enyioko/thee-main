import type { Request } from 'express';
import type { OrgUserRole, PartnerStatus, StaffRole } from '../generated/prisma/client';

export type StaffPrincipal = { kind: 'staff'; id: string; role: StaffRole };
export type ProviderPrincipal = {
  kind: 'provider'; id: string; role: OrgUserRole; orgId: string; orgStatus: PartnerStatus;
};
export type DistributorPrincipal = {
  kind: 'distributor'; id: string; role: OrgUserRole; orgId: string; orgStatus: PartnerStatus;
};
export type Principal = StaffPrincipal | ProviderPrincipal | DistributorPrincipal;
export type PrincipalKind = Principal['kind'];

export interface TokenPayload {
  sub: string;
  kind: PrincipalKind;
  tv: number;
  typ: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedRequest extends Request {
  principal: Principal;
}
