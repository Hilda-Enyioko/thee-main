import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { actorOf, AuditService } from '../audit/audit.service';
import type { DistributorPrincipal, ProviderPrincipal } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamMemberDto } from './dto/team.dto';
import { distributorStore, providerStore, TeamStore } from './team.stores';

type OrgPrincipal = ProviderPrincipal | DistributorPrincipal;

@Injectable()
export class TeamService {
  private readonly stores: Record<OrgPrincipal['kind'], TeamStore>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {
    this.stores = { provider: providerStore(prisma), distributor: distributorStore(prisma) };
  }

  list(p: OrgPrincipal) {
    return this.stores[p.kind].list(p.orgId);
  }

  async create(p: OrgPrincipal, dto: CreateTeamMemberDto) {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const member = await this.stores[p.kind].create(tx, p.orgId, {
          email: dto.email, fullName: dto.fullName, passwordHash, role: dto.role,
        });
        await this.audit.record(tx, {
          ...actorOf(p), action: `${p.kind}.team.created`, entityType: `${p.kind}_user`, entityId: member.id,
          after: { role: member.role, email: member.email },
        });
        return member;
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('A user with this email already exists');
      throw e;
    }
  }

  deactivate(p: OrgPrincipal, id: string) {
    if (id === p.id) throw new BadRequestException('You cannot deactivate your own account');
    return this.prisma.$transaction(async (tx) => {
      const store = this.stores[p.kind];
      const target = await store.find(tx, p.orgId, id); // tenant scoped
      if (!target) throw new NotFoundException('Team member not found');
      if (target.status !== 'ACTIVE') throw new ConflictException(`This user is already ${target.status.toLowerCase()}`);
      if (target.role === 'ADMIN' && (await store.otherActiveAdmins(tx, p.orgId, id)) === 0) {
        throw new ConflictException('Cannot deactivate the last active admin');
      }
      const updated = await store.setStatus(tx, id, 'DEACTIVATED');
      await this.audit.record(tx, {
        ...actorOf(p), action: `${p.kind}.team.deactivated`, entityType: `${p.kind}_user`, entityId: id,
        before: { status: 'ACTIVE' }, after: { status: 'DEACTIVATED' },
      });
      return updated;
    });
  }

  // Only DEACTIVATED users come back. SUSPENDED is staff-controlled and stays out of reach.
  reactivate(p: OrgPrincipal, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const store = this.stores[p.kind];
      const target = await store.find(tx, p.orgId, id);
      if (!target) throw new NotFoundException('Team member not found');
      if (target.status !== 'DEACTIVATED') throw new ConflictException('Only deactivated users can be reactivated');
      const updated = await store.setStatus(tx, id, 'ACTIVE');
      await this.audit.record(tx, {
        ...actorOf(p), action: `${p.kind}.team.reactivated`, entityType: `${p.kind}_user`, entityId: id,
        before: { status: 'DEACTIVATED' }, after: { status: 'ACTIVE' },
      });
      return updated;
    });
  }
}
