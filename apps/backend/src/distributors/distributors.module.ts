import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DistributorsController } from './distributors.controller';
import { DistributorsService } from './distributors.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [DistributorsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
