import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { actorOf, AuditService } from '../audit/audit.service';
import type { ProviderPrincipal, StaffPrincipal } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { ReviewKycDto, ReviewListQueryDto, SubmitKycDto, UpdateProfileDto } from '../common/dto/kyc.dto';
import { OnboardOrgDto } from '../common/dto/onboard-org.dto';
import { DUPLICATE_ORG_MESSAGE, isUniqueViolation } from '../common/prisma-errors';
import type { Prisma, Provider } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const toProviderView = (p: Provider) => ({
  id: p.id,
  legalName: p.legalName,
  tradingName: p.tradingName,
  rcNumber: p.rcNumber,
  email: p.email,
  phone: p.phone,
  address: p.address,
  status: p.status,
  settlement: p.settlementAccountNumber
    ? {
        bankName: p.settlementBankName,
        accountName: p.settlementAccountName,
        accountNumberLast4: p.settlementAccountNumber.slice(-4),
      }
    : null,
  createdAt: p.createdAt,
});

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async onboard(dto: OnboardOrgDto) {
    const passwordHash = await this.passwords.hash(dto.admin.password);
    try {
      const provider = await this.prisma.$transaction(async (tx) => {
        const created = await tx.provider.create({
          data: {
            legalName: dto.legalName,
            tradingName: dto.tradingName,
            rcNumber: dto.rcNumber,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            users: {
              create: { fullName: dto.admin.fullName, email: dto.admin.email, passwordHash, role: 'ADMIN' },
            },
          },
        });
        await this.audit.record(tx, {
          actorType: 'SYSTEM', action: 'provider.onboarded',
          entityType: 'provider', entityId: created.id,
          after: { rcNumber: created.rcNumber, email: created.email },
        });
        return created;
      });
      return toProviderView(provider);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(DUPLICATE_ORG_MESSAGE);
      throw e;
    }
  }

  async me(p: ProviderPrincipal) {
    const provider = await this.prisma.provider.findUniqueOrThrow({
      where: { id: p.orgId },
      include: { kyc: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const k = provider.kyc[0];
    return {
      ...toProviderView(provider),
      latestKyc: k ? { status: k.status, reviewNote: k.reviewNote, reviewedAt: k.reviewedAt } : null,
    };
  }

  async submitKyc(p: ProviderPrincipal, dto: SubmitKycDto) {
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.provider.updateMany({
        where: { id: p.orgId, status: { in: ['PENDING_KYC', 'REJECTED'] } },
        data: { status: 'UNDER_REVIEW' },
      });
      if (moved.count !== 1) throw new ConflictException('KYC cannot be submitted in the current status');
      const kyc = await tx.providerKyc.create({
        data: {
          providerId: p.orgId,
          details: dto.details as Prisma.InputJsonObject,
          documents: dto.documents.map((d) => ({ kind: d.kind, publicId: d.publicId })),
        },
      });
      await this.audit.record(tx, {
        ...actorOf(p), action: 'provider.kyc.submitted', entityType: 'provider', entityId: p.orgId,
        after: { kycId: kyc.id },
      });
    });
    return { status: 'UNDER_REVIEW' as const };
  }

  async updateProfile(p: ProviderPrincipal, dto: UpdateProfileDto) {
    if (p.orgStatus !== 'APPROVED') {
      throw new ForbiddenException('The profile can be updated once KYC is approved');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.provider.update({
        where: { id: p.orgId },
        data: {
          tradingName: dto.tradingName,
          phone: dto.phone,
          address: dto.address,
          ...(dto.settlement && {
            settlementBankName: dto.settlement.bankName,
            settlementAccountNumber: dto.settlement.accountNumber,
            settlementAccountName: dto.settlement.accountName,
          }),
        },
      });
      await this.audit.record(tx, {
        ...actorOf(p), action: 'provider.profile.updated', entityType: 'provider', entityId: p.orgId,
        after: { fields: Object.keys(dto) }, // field names only, never account numbers
      });
      return row;
    });
    return toProviderView(updated);
  }

  // ── used by the staff module ──

  async listForReview(q: ReviewListQueryDto) {
    const where = { status: q.status ?? 'UNDER_REVIEW' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.provider.findMany({
        where, orderBy: { createdAt: 'asc' },
        skip: (q.page - 1) * q.limit, take: q.limit,
        include: { kyc: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.provider.count({ where }),
    ]);
    return {
      total, page: q.page, limit: q.limit,
      items: items.map((i) => ({
        ...toProviderView(i),
        latestKyc: i.kyc[0]
          ? { id: i.kyc[0].id, status: i.kyc[0].status, details: i.kyc[0].details,
              documents: i.kyc[0].documents, submittedAt: i.kyc[0].createdAt }
          : null,
      })),
    };
  }

  async reviewKyc(staff: StaffPrincipal, providerId: string, dto: ReviewKycDto) {
    if (dto.decision === 'REJECTED' && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when rejecting');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const kyc = await tx.providerKyc.findFirst({
        where: { providerId, status: 'SUBMITTED' }, orderBy: { createdAt: 'desc' },
      });
      if (!kyc) throw new NotFoundException('No KYC submission awaiting review');
      const moved = await tx.provider.updateMany({
        where: { id: providerId, status: 'UNDER_REVIEW' }, data: { status: dto.decision },
      });
      if (moved.count !== 1) throw new ConflictException('Provider is not under review');
      await tx.providerKyc.update({
        where: { id: kyc.id },
        data: { status: dto.decision, reviewedById: staff.id, reviewNote: dto.note, reviewedAt: new Date() },
      });
      await this.audit.record(tx, {
        ...actorOf(staff), action: `provider.kyc.${dto.decision.toLowerCase()}`,
        entityType: 'provider', entityId: providerId,
        before: { status: 'UNDER_REVIEW' }, after: { status: dto.decision, kycId: kyc.id },
      });
      return tx.provider.findUniqueOrThrow({ where: { id: providerId } });
    });
    return toProviderView(updated);
  }
}
