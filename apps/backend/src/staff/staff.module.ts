import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DistributorsModule } from '../distributors/distributors.module';
import { ProvidersModule } from '../providers/providers.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [AuthModule, ProvidersModule, DistributorsModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
