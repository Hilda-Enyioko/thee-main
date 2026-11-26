import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Access, CurrentPrincipal, Public } from '../auth/auth.decorators';
import type { ProviderPrincipal } from '../auth/auth.types';
import { SubmitKycDto, UpdateProfileDto } from '../common/dto/kyc.dto';
import { OnboardOrgDto } from '../common/dto/onboard-org.dto';
import { ProvidersService } from './providers.service';
import { SignUploadDto } from '../uploads/dto/sign-upload.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Public() @Post('onboard')
  onboard(@Body() dto: OnboardOrgDto) { return this.providers.onboard(dto); }

  @Access({ kind: 'provider' }) @Get('me')
  me(@CurrentPrincipal() p: ProviderPrincipal) { return this.providers.me(p); }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Post('kyc')
  submitKyc(@CurrentPrincipal() p: ProviderPrincipal, @Body() dto: SubmitKycDto) {
    return this.providers.submitKyc(p, dto);
  }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Patch('profile')
  updateProfile(@CurrentPrincipal() p: ProviderPrincipal, @Body() dto: UpdateProfileDto) {
    return this.providers.updateProfile(p, dto);
  }

  @Access({ kind: 'provider', roles: ['ADMIN'] }) @Post('uploads/sign') @HttpCode(200)
  signUpload(@CurrentPrincipal() p: ProviderPrincipal, @Body() dto: SignUploadDto) {
    return this.providers.signUpload(p, dto);
  }
}
