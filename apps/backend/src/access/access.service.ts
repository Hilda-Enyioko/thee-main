import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { actorOf, AuditService } from '../audit/audit.service';
import type { DistributorPrincipal, ProviderPrincipal, StaffPrincipal } from '../auth/auth.types';
import { isUniqueViolation } from '../common/prisma-errors';
import { DistributorsService } from '../distributors/distributors.service';
import type { DistributorAccessGrant, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { ProvidersService } from '../providers/providers.service';
import { GrantListQueryDto, RequestAccessDto, ReviewGrantDto, RevokeGrantDto, StaffGrantListQueryDto } from './dto/access.dto';

type Tx = Prisma.TransactionClient;
const unique = (xs: string[]) => [...new Set(xs)];

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly products: ProductsService,
    private readonly providers: ProvidersService,
    private readonly distributors: DistributorsService,
  ) {}

  // ── distributor side ──

  async catalogue(d: DistributorPrincipal) {
    const [products, grants] = await Promise.all([
      this.products.listCatalogue(),
      this.prisma.distributorAccessGrant.findMany({
        where: { distributorId: d.orgId }, select: { productId: true, status: true },
      }),
    ]);
    const status = new Map(grants.map((g) => [g.productId, g.status]));
    return products.map((p) => ({ ...p, accessStatus: status.get(p.id) ?? null }));
  }

  async requestAccess(d: DistributorPrincipal, dto: RequestAccessDto) {
    if (d.orgStatus !== 'APPROVED') {
      throw new ForbiddenException('Your organisation must pass KYC before requesting access');
    }
    const product = await this.products.findRequestable(dto.productId);
    if (!product) throw new NotFoundException('This product is not available');

    try {
      const grant = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.distributorAccessGrant.findUnique({
          where: { distributorId_productId: { distributorId: d.orgId, productId: product.id } },
        });
        if (existing && existing.status !== 'REJECTED') {
          throw new ConflictException(`An access request for this product is already ${existing.status.toLowerCase()}`);
        }
        const row = existing
          ? await tx.distributorAccessGrant.update({
              where: { id: existing.id },
              data: { status: 'PENDING', commissionBps: null, reviewedById: null, reviewNote: null, reviewedAt: null },
            })
          : await tx.distributorAccessGrant.create({
              data: { distributorId: d.orgId, providerId: product.providerId, productId: product.id },
            });
        await this.audit.record(tx, {
          ...actorOf(d), action: existing ? 'access.re_requested' : 'access.requested',
          entityType: 'access_grant', entityId: row.id, after: { productId: product.id, providerId: product.providerId },
        });
        return row;
      });
      return (await this.hydrate([grant], { providers: true }))[0];
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('An access request for this product already exists');
      throw e;
    }
  }

  async listForDistributor(d: DistributorPrincipal, q: GrantListQueryDto) {
    return this.page({ distributorId: d.orgId, ...(q.status && { status: q.status }) }, q, { providers: true });
  }

  // ── provider side ──

  async listForProvider(p: ProviderPrincipal, q: GrantListQueryDto) {
    return this.page({ providerId: p.orgId, ...(q.status && { status: q.status }) }, q, { distributors: true });
  }

  async review(p: ProviderPrincipal, id: string, dto: ReviewGrantDto) {
    if (dto.decision === 'REJECTED' && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when rejecting');
    }
    const grant = await this.prisma.distributorAccessGrant.findFirst({ where: { id, providerId: p.orgId } });
    if (!grant) throw new NotFoundException('Access request not found');
    if (grant.status !== 'PENDING') throw new ConflictException(`This request is already ${grant.status.toLowerCase()}`);

    let commissionBps: number | null = null;
    if (dto.decision === 'APPROVED') {
      const distributor = (await this.distributors.getSummaries([grant.distributorId])).get(grant.distributorId);
      if (distributor?.status !== 'APPROVED') throw new ConflictException('This distributor is not currently approved');
      const product = (await this.products.summaries([grant.productId])).get(grant.productId);
      if (!product || product.status !== 'ACTIVE') throw new ConflictException('This product is not active');
      commissionBps = dto.commissionBps ?? product.defaultCommissionBps;
      if (commissionBps === null) {
        throw new BadRequestException('Provide commissionBps, or set a defaultCommissionBps on the product');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.distributorAccessGrant.updateMany({
        where: { id, providerId: p.orgId, status: 'PENDING' },
        data: {
          status: dto.decision, commissionBps, reviewedById: p.id,
          reviewNote: dto.note, reviewedAt: new Date(),
        },
      });
      if (moved.count !== 1) throw new ConflictException('This request was already handled');
      await this.audit.record(tx, {
        ...actorOf(p), action: `access.${dto.decision.toLowerCase()}`, entityType: 'access_grant', entityId: id,
        before: { status: 'PENDING' }, after: { status: dto.decision, commissionBps },
      });
      return tx.distributorAccessGrant.findUniqueOrThrow({ where: { id } });
    });
    return (await this.hydrate([updated], { distributors: true }))[0];
  }

  // Provider (own grants only) or staff (any grant).
  async revoke(actor: ProviderPrincipal | StaffPrincipal, id: string, dto: RevokeGrantDto) {
    const scope = actor.kind === 'provider' ? { providerId: actor.orgId } : {};
    const updated = await this.prisma.$transaction(async (tx) => {
      const moved = await tx.distributorAccessGrant.updateMany({
        where: { id, ...scope, status: 'APPROVED' },
        data: { status: 'REVOKED', reviewNote: dto.note, reviewedAt: new Date() },
      });
      if (moved.count !== 1) await this.failTransition(tx, id, scope);
      await this.audit.record(tx, {
        ...actorOf(actor), action: 'access.revoked', entityType: 'access_grant', entityId: id,
        before: { status: 'APPROVED' }, after: { status: 'REVOKED', note: dto.note },
      });
      return tx.distributorAccessGrant.findUniqueOrThrow({ where: { id } });
    });
    return (await this.hydrate([updated], { providers: true, distributors: true }))[0];
  }

  // ── staff oversight ──

  async listForStaff(q: StaffGrantListQueryDto) {
    return this.page(
      {
        ...(q.status && { status: q.status }),
        ...(q.providerId && { providerId: q.providerId }),
        ...(q.distributorId && { distributorId: q.distributorId }),
      },
      q,
      { providers: true, distributors: true },
    );
  }

  // ── helpers ──

  private async failTransition(tx: Tx, id: string, scope: { providerId?: string }): Promise<never> {
    const row = await tx.distributorAccessGrant.findFirst({ where: { id, ...scope }, select: { status: true } });
    if (!row) throw new NotFoundException('Access grant not found');
    throw new ConflictException(`This grant is ${row.status.toLowerCase()}, not approved`);
  }

  private async page(
    where: Prisma.DistributorAccessGrantWhereInput,
    q: { page: number; limit: number },
    include: { providers?: boolean; distributors?: boolean },
  ) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.distributorAccessGrant.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit,
      }),
      this.prisma.distributorAccessGrant.count({ where }),
    ]);
    return { total, page: q.page, limit: q.limit, items: await this.hydrate(rows, include) };
  }

  private async hydrate(
    grants: DistributorAccessGrant[],
    include: { providers?: boolean; distributors?: boolean },
  ) {
    const products = await this.products.summaries(unique(grants.map((g) => g.productId)));
    const providers = include.providers
      ? await this.providers.getSummaries(unique(grants.map((g) => g.providerId))) : null;
    const distributors = include.distributors
      ? await this.distributors.getSummaries(unique(grants.map((g) => g.distributorId))) : null;

    return grants.map((g) => {
      const product = products.get(g.productId);
      const provider = providers?.get(g.providerId);
      const distributor = distributors?.get(g.distributorId);
      return {
        id: g.id, status: g.status, commissionBps: g.commissionBps, reviewNote: g.reviewNote,
        reviewedAt: g.reviewedAt, createdAt: g.createdAt,
        product: product ? { id: product.id, name: product.name, type: product.type } : null,
        ...(providers && { provider: provider ? { id: provider.id, name: provider.name } : null }),
        ...(distributors && {
          distributor: distributor
            ? { id: distributor.id, name: distributor.name, type: distributor.type, city: distributor.city }
            : null,
        }),
      };
    });
  }
}
