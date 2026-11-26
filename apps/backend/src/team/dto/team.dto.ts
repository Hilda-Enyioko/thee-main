import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizedEmail } from '../../common/dto/normalized-email.decorator';
import { OrgUserRole } from '../../generated/prisma/client';

export class CreateTeamMemberDto {
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @NormalizedEmail() email!: string;
  @IsString() @MinLength(10) @MaxLength(128) password!: string;
  @IsEnum(OrgUserRole) role!: OrgUserRole;
}
