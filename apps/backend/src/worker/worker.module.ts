import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { validateEnv } from '../config/env';
import { NotificationsProcessor } from '../notifications/notifications.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUES } from '../queue/queue.constants';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    QueueModule,
    BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS }),
  ],
  providers: [NotificationsProcessor],
})
export class WorkerModule {}