import { IsEnum, IsString, MaxLength, MinLength, IsIn, Matches } from 'class-validator';
import { NormalizedEmail } from '../../common/dto/normalized-email.decorator';
import { StaffRole, UserStatus } from '../../generated/prisma/client';
import { KYC_ALLOWED_FORMATS } from '../../uploads/uploads.constants';

export class CreateStaffDto {
  @NormalizedEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @IsEnum(StaffRole) role!: StaffRole;
}

export class SetStaffStatusDto {
  @IsEnum(UserStatus) status!: UserStatus;
}

export class DocumentUrlQueryDto {
  @Matches(/^kyc\/(provider|distributor)\/[0-9a-f-]{36}\/[a-z_]+-[0-9a-f-]{36}$/, {
    message: 'publicId is not a KYC document reference',
  })
  publicId!: string;
  @IsIn([...KYC_ALLOWED_FORMATS]) format!: string;
}
