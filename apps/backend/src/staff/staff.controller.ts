import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Access, CurrentPrincipal } from '../auth/auth.decorators';
import type { StaffPrincipal } from '../auth/auth.types';
import { ReviewKycDto, ReviewListQueryDto } from '../common/dto/kyc.dto';
import { DistributorsService } from '../distributors/distributors.service';
import { ProvidersService } from '../providers/providers.service';
import { CreateStaffDto, SetStaffStatusDto } from './dto/staff.dto';
import { StaffService } from './staff.service';

const KYC_ROLES = ['SUPER_ADMIN', 'ADMIN', 'KYC_REVIEWER'] as const;

@Controller('staff')
export class StaffController {
  constructor(
    private readonly staff: StaffService,
    private readonly providers: ProvidersService,
    private readonly distributors: DistributorsService,
  ) {}

  @Access({ kind: 'staff', roles: ['SUPER_ADMIN'] }) @Post('accounts')
  create(@CurrentPrincipal() a: StaffPrincipal, @Body() dto: CreateStaffDto) {
    return this.staff.create(a, dto);
  }

  @Access({ kind: 'staff', roles: ['SUPER_ADMIN'] }) @Get('accounts')
  list() { return this.staff.list(); }

  @Access({ kind: 'staff', roles: ['SUPER_ADMIN'] }) @Patch('accounts/:id/status')
  setStatus(
    @CurrentPrincipal() a: StaffPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStaffStatusDto,
  ) {
    return this.staff.setStatus(a, id, dto);
  }

  @Access({ kind: 'staff', roles: KYC_ROLES }) @Get('kyc/providers')
  listProviders(@Query() q: ReviewListQueryDto) { return this.providers.listForReview(q); }

  @Access({ kind: 'staff', roles: KYC_ROLES }) @Patch('kyc/providers/:id')
  reviewProvider(
    @CurrentPrincipal() a: StaffPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.providers.reviewKyc(a, id, dto);
  }

  @Access({ kind: 'staff', roles: KYC_ROLES }) @Get('kyc/distributors')
  listDistributors(@Query() q: ReviewListQueryDto) { return this.distributors.listForReview(q); }

  @Access({ kind: 'staff', roles: KYC_ROLES }) @Patch('kyc/distributors/:id')
  reviewDistributor(
    @CurrentPrincipal() a: StaffPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.distributors.reviewKyc(a, id, dto);
  }
}
