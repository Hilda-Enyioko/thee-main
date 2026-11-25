import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StaffModule } from './staff/staff.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.service';
import { ProvidersModule } from './providers/providers.module';
import { DistributorsModule } from './distributors/distributors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    HealthModule,
    PrismaModule,
    QueueModule,
    NotificationsModule,
    AuditModule,
    AuthModule,
    ProvidersModule,
    DistributorsModule,
    StaffModule,
  ],
})
export class AppModule {}
