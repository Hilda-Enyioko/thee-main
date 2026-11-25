import { Global, Injectable, Module } from '@nestjs/common';
import type { Principal } from '../auth/auth.types';
import type { ActorType, Prisma } from '../generated/prisma/client';

export interface AuditEntry {
  actorType: ActorType;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

export function actorOf(p: Principal): Pick<AuditEntry, 'actorType' | 'actorId'> {
  const actorType: ActorType =
    p.kind === 'staff' ? 'STAFF' : p.kind === 'provider' ? 'PROVIDER_USER' : 'DISTRIBUTOR_USER';
  return { actorType, actorId: p.id };
}

@Injectable()
export class AuditService {
  async record(tx: Prisma.TransactionClient, e: AuditEntry): Promise<void> {
    await tx.auditLog.create({ data: e });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
