import type { OrgUserRole, Prisma, UserStatus } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

export type TeamMember = {
  id: string; email: string; fullName: string; role: OrgUserRole; status: UserStatus; createdAt: Date;
};
export type NewMember = { email: string; fullName: string; passwordHash: string; role: OrgUserRole };

export interface TeamStore {
  list(orgId: string): Promise<TeamMember[]>;
  find(tx: Tx, orgId: string, id: string): Promise<TeamMember | null>;
  create(tx: Tx, orgId: string, m: NewMember): Promise<TeamMember>;
  otherActiveAdmins(tx: Tx, orgId: string, excludeId: string): Promise<number>;
  setStatus(tx: Tx, id: string, status: UserStatus): Promise<TeamMember>; // also revokes live tokens
}

const SELECT = { id: true, email: true, fullName: true, role: true, status: true, createdAt: true } as const;
const REVOKE = { tokenVersion: { increment: 1 } } as const;

export const providerStore = (prisma: PrismaService): TeamStore => ({
  list: (orgId) =>
    prisma.providerUser.findMany({ where: { providerId: orgId }, select: SELECT, orderBy: { createdAt: 'asc' } }),
  find: (tx, orgId, id) => tx.providerUser.findFirst({ where: { id, providerId: orgId }, select: SELECT }),
  create: (tx, orgId, m) => tx.providerUser.create({ data: { ...m, providerId: orgId }, select: SELECT }),
  otherActiveAdmins: (tx, orgId, excludeId) =>
    tx.providerUser.count({ where: { providerId: orgId, role: 'ADMIN', status: 'ACTIVE', id: { not: excludeId } } }),
  setStatus: (tx, id, status) => tx.providerUser.update({ where: { id }, data: { status, ...REVOKE }, select: SELECT }),
});

export const distributorStore = (prisma: PrismaService): TeamStore => ({
  list: (orgId) =>
    prisma.distributorUser.findMany({ where: { distributorId: orgId }, select: SELECT, orderBy: { createdAt: 'asc' } }),
  find: (tx, orgId, id) => tx.distributorUser.findFirst({ where: { id, distributorId: orgId }, select: SELECT }),
  create: (tx, orgId, m) => tx.distributorUser.create({ data: { ...m, distributorId: orgId }, select: SELECT }),
  otherActiveAdmins: (tx, orgId, excludeId) =>
    tx.distributorUser.count({ where: { distributorId: orgId, role: 'ADMIN', status: 'ACTIVE', id: { not: excludeId } } }),
  setStatus: (tx, id, status) => tx.distributorUser.update({ where: { id }, data: { status, ...REVOKE }, select: SELECT }),
});
