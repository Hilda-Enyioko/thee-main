import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { actorOf, AuditService } from '../audit/audit.service';
import type { DistributorPrincipal, StaffPrincipal } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { ReviewKycDto, ReviewListQueryDto, SubmitKycDto, UpdateProfileDto } from '../common/dto/kyc.dto';
import { DUPLICATE_ORG_MESSAGE, isUniqueViolation } from '../common/prisma-errors';
import type {
  Distributor,
  DistributorType,
  PartnerStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardDistributorDto } from './dto/onboard-distributor.dto';
import { UploadsService } from '../uploads/uploads.service';
import { SignUploadDto } from '../uploads/dto/sign-upload.dto';

export const toDistributorView = (d: Distributor) => ({
  id: d.id,
  type: d.type,
  legalName: d.legalName,
  tradingName: d.tradingName,
  rcNumber: d.rcNumber,
  email: d.email,
  phone: d.phone,
  address: d.address,
  city: d.city,
  status: d.status,
  settlement: d.settlementAccountNumber
    ? {
        bankName: d.settlementBankName,
        accountName: d.settlementAccountName,
        accountNumberLast4: d.settlementAccountNumber.slice(-4),
      }
    : null,
  createdAt: d.createdAt,
});

@Injectable()
export class DistributorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly uploads: UploadsService,
  ) {}

  async onboard(dto: OnboardDistributorDto) {
    const passwordHash = await this.passwords.hash(dto.admin.password);
    try {
      const distributor = await this.prisma.$transaction(async (tx) => {
        const created = await tx.distributor.create({
          data: {
            type: dto.type,
            legalName: dto.legalName,
            tradingName: dto.tradingName,
            rcNumber: dto.rcNumber,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            city: dto.city,
            users: {
              create: { fullName: dto.admin.fullName, email: dto.admin.email, passwordHash, role: 'ADMIN' },
            },
          },
        });
        await this.audit.record(tx, {
          actorType: 'SYSTEM', action: 'distributor.onboarded',
          entityType: 'distributor', entityId: created.id,
          after: { type: created.type, rcNumber: created.rcNumber, email: created.email },
        });
        return created;
      });
      return toDistributorView(distributor);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(DUPLICATE_ORG_MESSAGE);
      throw e;
    }
  }

  async me(p: DistributorPrincipal) {
    const d = await this.prisma.distributor.findUniqueOrThrow({
      where: { id: p.orgId },
      include: { kyc: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const k = d.kyc[0];
    return {
      ...toDistributorView(d),
      latestKyc: k ? { status: k.status, reviewNote: k.reviewNote, reviewedAt: k.reviewedAt } : null,
    };
  }

  async signUpload(p: DistributorPrincipal, dto: SignUploadDto) {
    if (p.orgStatus !== 'PENDING_KYC' && p.orgStatus !== 'REJECTED') {
      throw new ConflictException('Document uploads are only open before KYC approval');
    }
    return this.uploads.signKycUpload('distributor', p.orgId, dto.kind);
  }

  async submitKyc(p: DistributorPrincipal, dto: SubmitKycDto) {
    const documents = await this.uploads.verifyKycDocuments(
      'distributor',
      p.orgId,
      dto.documents,
    );

    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.distributor.updateMany({
        where: { id: p.orgId, status: { in: ['PENDING_KYC', 'REJECTED'] } },
        data: { status: 'UNDER_REVIEW' },
      });
      if (moved.count !== 1) throw new ConflictException(
        'KYC cannot be submitted in the current status',
      );
      const kyc = await tx.distributorKyc.create({
        data: {
          distributorId: p.orgId,
          details: dto.details as Prisma.InputJsonObject,
          documents,
        },
      });
      await this.audit.record(tx, {
        ...actorOf(p), action: 'distributor.kyc.submitted', entityType: 'distributor', entityId: p.orgId,
        after: { kycId: kyc.id },
      });
    });
    return { status: 'UNDER_REVIEW' as const };
  }

  async updateProfile(p: DistributorPrincipal, dto: UpdateProfileDto) {
    if (p.orgStatus !== 'APPROVED') {
      throw new ForbiddenException('The profile can be updated once KYC is approved');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.distributor.update({
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
        ...actorOf(p), action: 'distributor.profile.updated', entityType: 'distributor', entityId: p.orgId,
        after: { fields: Object.keys(dto) },
      });
      return row;
    });
    return toDistributorView(updated);
  }

  async listForReview(q: ReviewListQueryDto) {
    const where = { status: q.status ?? 'UNDER_REVIEW' };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.distributor.findMany({
        where, orderBy: { createdAt: 'asc' },
        skip: (q.page - 1) * q.limit, take: q.limit,
        include: { kyc: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.distributor.count({ where }),
    ]);
    return {
      total, page: q.page, limit: q.limit,
      items: items.map((i) => ({
        ...toDistributorView(i),
        latestKyc: i.kyc[0]
          ? { id: i.kyc[0].id, status: i.kyc[0].status, details: i.kyc[0].details,
              documents: i.kyc[0].documents, submittedAt: i.kyc[0].createdAt }
          : null,
      })),
    };
  }

  async reviewKyc(staff: StaffPrincipal, distributorId: string, dto: ReviewKycDto) {
    if (dto.decision === 'REJECTED' && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when rejecting');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const kyc = await tx.distributorKyc.findFirst({
        where: { distributorId, status: 'SUBMITTED' }, orderBy: { createdAt: 'desc' },
      });
      if (!kyc) throw new NotFoundException('No KYC submission awaiting review');
      const moved = await tx.distributor.updateMany({
        where: { id: distributorId, status: 'UNDER_REVIEW' }, data: { status: dto.decision },
      });
      if (moved.count !== 1) throw new ConflictException('Distributor is not under review');
      await tx.distributorKyc.update({
        where: { id: kyc.id },
        data: { status: dto.decision, reviewedById: staff.id, reviewNote: dto.note, reviewedAt: new Date() },
      });
      await this.audit.record(tx, {
        ...actorOf(staff), action: `distributor.kyc.${dto.decision.toLowerCase()}`,
        entityType: 'distributor', entityId: distributorId,
        before: { status: 'UNDER_REVIEW' }, after: { status: dto.decision, kycId: kyc.id },
      });
      return tx.distributor.findUniqueOrThrow({ where: { id: distributorId } });
    });
    return toDistributorView(updated);
  }

  async getSummaries(ids: string[]): Promise<Map<string, {
    id: string;
    name: string;
    type: DistributorType;
    city: string | null;
    status: PartnerStatus;
  }>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.distributor.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        legalName: true,
        tradingName: true,
        type: true,
        city: true,
        status: true,
      },
    });
    return new Map(rows.map((r) => [r.id, {
      id: r.id,
      name: r.tradingName ?? r.legalName,
      type: r.type,
      city: r.city,
      status: r.status,
    }]));
  }
}
