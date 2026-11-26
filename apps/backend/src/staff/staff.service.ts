import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { actorOf, AuditService } from '../audit/audit.service';
import type { StaffPrincipal } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { isUniqueViolation } from '../common/prisma-errors';
import type { StaffUser } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStaffDto,
  DocumentUrlQueryDto,
  SetStaffStatusDto,
} from './dto/staff.dto';
import { UploadsService } from '../uploads/uploads.service';

const toView = (s: StaffUser) => ({
  id: s.id, email: s.email, fullName: s.fullName, role: s.role, status: s.status, createdAt: s.createdAt,
});

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly uploads: UploadsService,
  ) {}

  async create(actor: StaffPrincipal, dto: CreateStaffDto) {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const staff = await this.prisma.$transaction(async (tx) => {
        const s = await tx.staffUser.create({
          data: { email: dto.email, fullName: dto.fullName, role: dto.role, passwordHash },
        });
        await this.audit.record(tx, {
          ...actorOf(actor), action: 'staff.created', entityType: 'staff', entityId: s.id,
          after: { role: s.role, email: s.email },
        });
        return s;
      });
      return toView(staff);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('A staff account with this email exists');
      throw e;
    }
  }

  async list() {
    const rows = await this.prisma.staffUser.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toView);
  }

  async setStatus(actor: StaffPrincipal, id: string, dto: SetStaffStatusDto) {
    if (id === actor.id) throw new BadRequestException('You cannot change your own status');
    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.staffUser.findUnique({ where: { id } });
      if (!before) throw new NotFoundException();
      const row = await tx.staffUser.update({
        where: { id },
        data: { status: dto.status, tokenVersion: { increment: 1 } },
      });
      await this.audit.record(tx, {
        ...actorOf(actor), action: 'staff.status_changed', entityType: 'staff', entityId: id,
        before: { status: before.status }, after: { status: row.status },
      });
      return row;
    });
    return toView(updated);
  }

  async kycDocumentUrl(actor: StaffPrincipal, q: DocumentUrlQueryDto) {
    const link = this.uploads.signedDownloadUrl(q.publicId, q.format);
    await this.prisma.$transaction((tx) =>
      this.audit.record(tx, {
        ...actorOf(actor), action: 'kyc.document.viewed', entityType: 'kyc_document', entityId: q.publicId,
      }),
    );
    return link;
  }
}
