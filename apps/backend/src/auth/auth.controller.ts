import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { NormalizedEmail } from '../common/dto/normalized-email.decorator';
import { Public } from './auth.decorators';
import { AuthService } from './auth.service';

class LoginDto {
  @NormalizedEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}

class RefreshDto {
  @IsString() refreshToken!: string;
}

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('staff/login') @HttpCode(200)
  staff(@Body() d: LoginDto) { return this.auth.login('staff', d.email, d.password); }

  @Post('provider/login') @HttpCode(200)
  provider(@Body() d: LoginDto) { return this.auth.login('provider', d.email, d.password); }

  @Post('distributor/login') @HttpCode(200)
  distributor(@Body() d: LoginDto) { return this.auth.login('distributor', d.email, d.password); }

  @Post('refresh') @HttpCode(200)
  refresh(@Body() d: RefreshDto) { return this.auth.refresh(d.refreshToken); }
}
