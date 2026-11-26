import { Module } from '@nestjs/common';
import { DistributorsModule } from '../distributors/distributors.module';
import { ProductsModule } from '../products/products.module';
import { ProvidersModule } from '../providers/providers.module';
import { AccessService } from './access.service';
import { DistributorAccessController, ProviderAccessController } from './access.controller';

@Module({
  imports: [ProductsModule, ProvidersModule, DistributorsModule],
  controllers: [DistributorAccessController, ProviderAccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
