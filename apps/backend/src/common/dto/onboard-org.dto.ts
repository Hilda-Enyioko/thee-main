import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { NormalizedEmail } from './normalized-email.decorator';

export class AdminUserDto {
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @NormalizedEmail() email!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
}

export class OnboardOrgDto {
  @IsString() @MinLength(2) @MaxLength(200) legalName!: string;
  @IsOptional() @IsString() @MaxLength(200) tradingName?: string;
  @IsString() @MinLength(3) @MaxLength(30) rcNumber!: string;
  @NormalizedEmail() email!: string;
  @IsString() @MinLength(7) @MaxLength(20) phone!: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ValidateNested() @Type(() => AdminUserDto) admin!: AdminUserDto;
}
