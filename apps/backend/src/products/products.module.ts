import { Module } from '@nestjs/common';
import { AdaptersModule } from '../adapters/adapters.module';
import { ProvidersModule } from '../providers/providers.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [ProvidersModule, AdaptersModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
