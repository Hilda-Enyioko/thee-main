import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { AdapterRegistry } from '../adapters/adapter.registry';
import type { PricingRule, QuoteResult } from '../adapters/provider-adapter';
import { actorOf, AuditService } from '../audit/audit.service';
import type { ProviderPrincipal } from '../auth/auth.types';
import { isUniqueViolation } from '../common/prisma-errors';
import {
  Prisma, type Product, type ProductPlan, type ProductStatus, type ProductType,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from '../providers/providers.service';
import {
  CreatePlanDto,
  CreateProductDto,
  PricingRuleDto,
  QuoteDto,
  SetPlanActiveDto,
  UpdateProductDto,
} from './dto/product.dto';
import { parseRisk } from './dto/risk.dto';

const D = Prisma.Decimal;
const WITH_PLANS = { plans: { orderBy: { createdAt: 'asc' } } } as const;
type ProductWithPlans = Product & { plans: ProductPlan[] };

const TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ARCHIVED'],
  ARCHIVED: [],
};

export interface ProductSummary {
  id: string; providerId: string; type: ProductType; code: string; name: string;
  status: ProductStatus; defaultCommissionBps: number | null;
}
const SUMMARY_SELECT = {
  id: true, providerId: true, type: true, code: true, name: true, status: true, defaultCommissionBps: true,
} as const;

const toPlanView = (pl: ProductPlan) => ({
  id: pl.id, name: pl.name, coverAmount: pl.coverAmount.toFixed(2), pricingRule: pl.pricingRule,
  installmentsOk: pl.installmentsOk, active: pl.active, createdAt: pl.createdAt,
});

const toProductView = (p: ProductWithPlans) => ({
  id: p.id, type: p.type, code: p.code, name: p.name, status: p.status, terms: p.terms,
  defaultCommissionBps: p.defaultCommissionBps, plans: p.plans.map(toPlanView), createdAt: p.createdAt,
});

function normalisePricingRule(d: PricingRuleDto): PricingRule {
  if (d.kind === 'FLAT') {
    const premium = new D(d.premium!);
    if (premium.lte(0)) throw new BadRequestException('premium must be greater than zero');
    return { kind: 'FLAT', premium: premium.toFixed(2) };
  }
  const min = d.min !== undefined ? new D(d.min) : undefined;
  const max = d.max !== undefined ? new D(d.max) : undefined;
  if (min && max && min.gt(max)) throw new BadRequestException('min cannot be greater than max');
  return {
    kind: 'PERCENT_OF_VALUE',
    rateBps: d.rateBps!,
    ...(min && { min: min.toFixed(2) }),
    ...(max && { max: max.toFixed(2) }),
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly providers: ProvidersService,
    private readonly adapters: AdapterRegistry,
  ) {}

  private assertApproved(p: ProviderPrincipal): void {
    if (p.orgStatus !== 'APPROVED') {
      throw new ForbiddenException('Your organisation must pass KYC before managing products');
    }
  }

  async create(p: ProviderPrincipal, dto: CreateProductDto) {
    this.assertApproved(p);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.product.create({
          data: {
            providerId: p.orgId, type: dto.type, code: dto.code, name: dto.name,
            terms: instanceToPlain(dto.terms) as Prisma.InputJsonObject,
            defaultCommissionBps: dto.defaultCommissionBps,
          },
          include: WITH_PLANS,
        });
        await this.audit.record(tx, {
          ...actorOf(p), action: 'product.created', entityType: 'product', entityId: row.id,
          after: { type: row.type, code: row.code },
        });
        return toProductView(row);
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('You already have a product with this code');
      throw e;
    }
  }

  async list(p: ProviderPrincipal) {
    const rows = await this.prisma.product.findMany({
      where: { providerId: p.orgId }, orderBy: { createdAt: 'desc' }, include: WITH_PLANS,
    });
    return rows.map(toProductView);
  }

  async get(p: ProviderPrincipal, id: string) {
    const row = await this.prisma.product.findFirst({
      where: { id, providerId: p.orgId }, include: WITH_PLANS,
    });
    if (!row) throw new NotFoundException('Product not found');
    return toProductView(row);
  }

  async update(p: ProviderPrincipal, id: string, dto: UpdateProductDto) {
    this.assertApproved(p);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.product.findFirst({ where: { id, providerId: p.orgId }, include: WITH_PLANS });
      if (!before) throw new NotFoundException('Product not found');
      if (dto.terms && before.status !== 'DRAFT') {
        throw new ConflictException('Terms can only be edited while the product is a draft. Create a new product instead');
      }
      if (dto.status) {
        if (!TRANSITIONS[before.status].includes(dto.status)) {
          throw new ConflictException(`A ${before.status.toLowerCase()} product cannot become ${dto.status.toLowerCase()}`);
        }
        if (dto.status === 'ACTIVE' && !before.plans.some((pl) => pl.active)) {
          throw new ConflictException('Add at least one active plan before activating the product');
        }
      }
      const moved = await tx.product.updateMany({
        where: { id, providerId: p.orgId, status: before.status },
        data: {
          name: dto.name,
          status: dto.status,
          defaultCommissionBps: dto.defaultCommissionBps,
          ...(dto.terms && { terms: instanceToPlain(dto.terms) as Prisma.InputJsonObject }),
        },
      });
      if (moved.count !== 1) throw new ConflictException('The product changed while you were editing, retry');
      const after = await tx.product.findUniqueOrThrow({ where: { id }, include: WITH_PLANS });
      await this.audit.record(tx, {
        ...actorOf(p), action: 'product.updated', entityType: 'product', entityId: id,
        before: { status: before.status, name: before.name, defaultCommissionBps: before.defaultCommissionBps },
        after: { status: after.status, name: after.name, defaultCommissionBps: after.defaultCommissionBps,
                 termsChanged: Boolean(dto.terms) },
      });
      return toProductView(after);
    });
  }

  async createPlan(p: ProviderPrincipal, productId: string, dto: CreatePlanDto) {
    this.assertApproved(p);
    const cover = new D(dto.coverAmount);
    if (cover.lte(0)) throw new BadRequestException('coverAmount must be greater than zero');
    const rule = normalisePricingRule(dto.pricingRule);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: productId, providerId: p.orgId } });
      if (!product) throw new NotFoundException('Product not found');
      if (product.status === 'ARCHIVED') throw new ConflictException('Archived products cannot take new plans');
      const plan = await tx.productPlan.create({
        data: {
          productId, name: dto.name, coverAmount: cover.toFixed(2),
          pricingRule: rule as unknown as Prisma.InputJsonObject,
          installmentsOk: dto.installmentsOk ?? false,
        },
      });
      await this.audit.record(tx, {
        ...actorOf(p), action: 'product.plan.created', entityType: 'product', entityId: productId,
        after: { planId: plan.id, name: plan.name },
      });
      return toPlanView(plan);
    });
  }

  async setPlanActive(p: ProviderPrincipal, productId: string, planId: string, dto: SetPlanActiveDto) {
    this.assertApproved(p);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, providerId: p.orgId }, include: { plans: true },
      });
      const plan = product?.plans.find((pl) => pl.id === planId);
      if (!product || !plan) throw new NotFoundException('Plan not found');
      if (!dto.active && product.status === 'ACTIVE' && product.plans.filter((pl) => pl.active).length === 1 && plan.active) {
        throw new ConflictException('An active product needs at least one active plan. Archive the product instead');
      }
      const row = await tx.productPlan.update({ where: { id: planId }, data: { active: dto.active } });
      await this.audit.record(tx, {
        ...actorOf(p), action: dto.active ? 'product.plan.activated' : 'product.plan.deactivated',
        entityType: 'product', entityId: productId, after: { planId },
      });
      return toPlanView(row);
    });
  }

  quote(p: ProviderPrincipal, productId: string, planId: string, dto: QuoteDto) {
    return this.runQuote(p.orgId, productId, planId, dto.risk);
  }

  // The Phase 2 distributor quote endpoint calls this after it checks an approved access grant.
  async runQuote(
    providerId: string, productId: string, planId: string, rawRisk: unknown,
  ): Promise<QuoteResult & { productId: string; planId: string; adapterKey: string }> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, providerId },
      include: { plans: { where: { id: planId } } },
    });
    const plan = product?.plans[0];
    if (!product || !plan) throw new NotFoundException('Plan not found');
    if (product.status === 'ARCHIVED' || !plan.active) throw new ConflictException('This plan is not available for quoting');

    const risk = parseRisk(product.type, rawRisk);
    const adapter = this.adapters.get(await this.providers.getAdapterKey(providerId));
    const terms = product.terms as unknown as { durationMonths: number };
    const quote = await adapter.quote({
      product: { id: product.id, type: product.type, code: product.code },
      plan: {
        id: plan.id, name: plan.name, coverAmount: plan.coverAmount.toFixed(2),
        pricingRule: plan.pricingRule as unknown as PricingRule,
      },
      durationMonths: terms.durationMonths,
      risk,
    });
    return { productId, planId, adapterKey: adapter.key, ...quote };
  }

  // ── used by the access module ──

  async summaries(ids: string[]): Promise<Map<string, ProductSummary>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: SUMMARY_SELECT });
    return new Map(rows.map((r) => [r.id, r]));
  }

  // An active product of an approved provider: the only kind a distributor may request.
  async findRequestable(productId: string): Promise<ProductSummary | null> {
    const s = (await this.summaries([productId])).get(productId);
    if (!s || s.status !== 'ACTIVE') return null;
    const provider = (await this.providers.getSummaries([s.providerId])).get(s.providerId);
    return provider?.status === 'APPROVED' ? s : null;
  }

  async listCatalogue() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' }, orderBy: [{ type: 'asc' }, { name: 'asc' }], select: SUMMARY_SELECT,
    });
    const providers = await this.providers.getSummaries([...new Set(products.map((x) => x.providerId))]);
    return products
      .filter((x) => providers.get(x.providerId)?.status === 'APPROVED')
      .map((x) => ({
        id: x.id, type: x.type, code: x.code, name: x.name,
        provider: { id: x.providerId, name: providers.get(x.providerId)!.name },
      }));
  }
}
