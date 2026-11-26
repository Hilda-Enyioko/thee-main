import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Access, CurrentPrincipal } from '../auth/auth.decorators';
import type { DistributorPrincipal, ProviderPrincipal } from '../auth/auth.types';
import { CreateTeamMemberDto } from './dto/team.dto';
import { TeamService } from './team.service';

@Controller('providers/team')
export class ProviderTeamController {
  constructor(private readonly team: TeamService) {}

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Get()
  list(@CurrentPrincipal() p: ProviderPrincipal) { return this.team.list(p); }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Post()
  create(@CurrentPrincipal() p: ProviderPrincipal, @Body() dto: CreateTeamMemberDto) {
    return this.team.create(p, dto);
  }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Post(':id/deactivate') @HttpCode(200)
  deactivate(@CurrentPrincipal() p: ProviderPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.deactivate(p, id);
  }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Post(':id/reactivate') @HttpCode(200)
  reactivate(@CurrentPrincipal() p: ProviderPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.reactivate(p, id);
  }
}

@Controller('distributors/team')
export class DistributorTeamController {
  constructor(private readonly team: TeamService) {}

  @Access({ kind: 'distributor', roles: ['ADMIN'] }) @Get()
  list(@CurrentPrincipal() p: DistributorPrincipal) { return this.team.list(p); }

  @Access({ kind: 'distributor', roles: ['ADMIN'] }) @Post()
  create(@CurrentPrincipal() p: DistributorPrincipal, @Body() dto: CreateTeamMemberDto) {
    return this.team.create(p, dto);
  }

  @Access({ kind: 'distributor', roles: ['ADMIN'] }) @Post(':id/deactivate') @HttpCode(200)
  deactivate(@CurrentPrincipal() p: DistributorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.deactivate(p, id);
  }

  @Access({ kind: 'distributor', roles: ['ADMIN'] }) @Post(':id/reactivate') @HttpCode(200)
  reactivate(@CurrentPrincipal() p: DistributorPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.team.reactivate(p, id);
  }
}
