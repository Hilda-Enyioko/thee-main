import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PasswordService } from './auth/password.service';
import { PrismaClient } from './generated/prisma/client';

const logger = new Logger('SeedSuperAdmin');

async function main() {
  const { DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env;
  if (!DATABASE_URL || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    throw new Error('DATABASE_URL, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
  const email = SEED_ADMIN_EMAIL.trim().toLowerCase();
  try {
    if (await prisma.staffUser.findUnique({ where: { email } })) {
      logger.log('Super admin already exists, nothing to do');
      return;
    }
    const passwordHash = await new PasswordService().hash(SEED_ADMIN_PASSWORD);
    await prisma.$transaction(async (tx) => {
      const s = await tx.staffUser.create({
        data: { email, passwordHash, fullName: SEED_ADMIN_NAME ?? 'Super Admin', role: 'SUPER_ADMIN' },
      });
      await tx.auditLog.create({
        data: { actorType: 'SYSTEM', action: 'staff.seeded', entityType: 'staff', entityId: s.id },
      });
    });
    logger.log('Super admin created');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  logger.error(e);
  process.exit(1);
});
