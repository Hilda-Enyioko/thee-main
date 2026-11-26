import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Access, CurrentPrincipal, Public } from '../auth/auth.decorators';
import type { DistributorPrincipal } from '../auth/auth.types';
import { SubmitKycDto, UpdateProfileDto } from '../common/dto/kyc.dto';
import { OnboardDistributorDto } from './dto/onboard-distributor.dto';
import { DistributorsService } from './distributors.service';
import { SignUploadDto } from '../uploads/dto/sign-upload.dto';

@Controller('distributors')
export class DistributorsController {
  constructor(private readonly distributors: DistributorsService) {}

  @Public() @Post('onboard')
  onboard(@Body() dto: OnboardDistributorDto) { return this.distributors.onboard(dto); }

  @Access({ kind: 'distributor' }) @Get('me')
  me(@CurrentPrincipal() p: DistributorPrincipal) { return this.distributors.me(p); }

  @Access({ kind: 'distributor', roles: ['ADMIN'] }) @Post('kyc')
  submitKyc(@CurrentPrincipal() p: DistributorPrincipal, @Body() dto: SubmitKycDto) {
    return this.distributors.submitKyc(p, dto);
  }

  @Access({ kind: 'distributor', roles: ['ADMIN'] }) @Patch('profile')
  updateProfile(@CurrentPrincipal() p: DistributorPrincipal, @Body() dto: UpdateProfileDto) {
    return this.distributors.updateProfile(p, dto);
  }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Post('uploads/sign') @HttpCode(200)
  signUpload(@CurrentPrincipal() p: DistributorPrincipal, @Body() dto: SignUploadDto) {
    return this.distributors.signUpload(p, dto);
  }
}
