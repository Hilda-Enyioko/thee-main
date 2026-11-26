import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Access, CurrentPrincipal } from '../auth/auth.decorators';
import type { DistributorPrincipal, ProviderPrincipal } from '../auth/auth.types';
import { AccessService } from './access.service';
import { GrantListQueryDto, RequestAccessDto, ReviewGrantDto, RevokeGrantDto } from './dto/access.dto';

@Controller('distributors')
export class DistributorAccessController {
  constructor(private readonly access: AccessService) {}

  @Access({ kind: 'distributor' }) @Get('catalogue')
  catalogue(@CurrentPrincipal() d: DistributorPrincipal) { return this.access.catalogue(d); }

  @Access({ kind: 'distributor', roles: ['ADMIN'] }) @Post('access-requests')
  request(@CurrentPrincipal() d: DistributorPrincipal, @Body() dto: RequestAccessDto) {
    return this.access.requestAccess(d, dto);
  }

  @Access({ kind: 'distributor' }) @Get('access-requests')
  list(@CurrentPrincipal() d: DistributorPrincipal, @Query() q: GrantListQueryDto) {
    return this.access.listForDistributor(d, q);
  }
}

@Controller('providers/access-requests')
export class ProviderAccessController {
  constructor(private readonly access: AccessService) {}

  @Access({ kind: 'provider' }) @Get()
  list(@CurrentPrincipal() p: ProviderPrincipal, @Query() q: GrantListQueryDto) {
    return this.access.listForProvider(p, q);
  }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Patch(':id')
  review(
    @CurrentPrincipal() p: ProviderPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewGrantDto,
  ) {
    return this.access.review(p, id, dto);
  }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Post(':id/revoke')
  revoke(
    @CurrentPrincipal() p: ProviderPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeGrantDto,
  ) {
    return this.access.revoke(p, id, dto);
  }
}
