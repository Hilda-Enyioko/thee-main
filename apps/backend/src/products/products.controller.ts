import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Access, CurrentPrincipal } from '../auth/auth.decorators';
import type { ProviderPrincipal } from '../auth/auth.types';
import { CreatePlanDto, CreateProductDto, QuoteDto, SetPlanActiveDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

const ADMIN = { kind: 'provider', roles: ['ADMIN'] } as const;
const ANY = { kind: 'provider' } as const;

@Controller('providers/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Access(ADMIN) @Post()
  create(@CurrentPrincipal() p: ProviderPrincipal, @Body() dto: CreateProductDto) {
    return this.products.create(p, dto);
  }

  @Access(ANY) @Get()
  list(@CurrentPrincipal() p: ProviderPrincipal) { return this.products.list(p); }

  @Access(ANY) @Get(':id')
  get(@CurrentPrincipal() p: ProviderPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(p, id);
  }

  @Access(ADMIN) @Patch(':id')
  update(
    @CurrentPrincipal() p: ProviderPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(p, id, dto);
  }

  @Access(ADMIN) @Post(':id/plans')
  createPlan(
    @CurrentPrincipal() p: ProviderPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePlanDto,
  ) {
    return this.products.createPlan(p, id, dto);
  }

  @Access(ADMIN) @Patch(':id/plans/:planId')
  setPlanActive(
    @CurrentPrincipal() p: ProviderPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: SetPlanActiveDto,
  ) {
    return this.products.setPlanActive(p, id, planId, dto);
  }

  @Access(ANY) @Post(':id/plans/:planId/quote') @HttpCode(200)
  quote(
    @CurrentPrincipal() p: ProviderPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: QuoteDto,
  ) {
    return this.products.quote(p, id, planId, dto);
  }
}
