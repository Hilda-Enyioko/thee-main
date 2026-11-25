import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizedEmail } from '../../common/dto/normalized-email.decorator';
import { StaffRole, UserStatus } from '../../generated/prisma/client';

export class CreateStaffDto {
  @NormalizedEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @IsEnum(StaffRole) role!: StaffRole;
}

export class SetStaffStatusDto {
  @IsEnum(UserStatus) status!: UserStatus;
}
