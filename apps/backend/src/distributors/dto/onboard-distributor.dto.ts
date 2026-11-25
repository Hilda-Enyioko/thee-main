import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OnboardOrgDto } from '../../common/dto/onboard-org.dto';
import { DistributorType } from '../../generated/prisma/client';

export class OnboardDistributorDto extends OnboardOrgDto {
  @IsEnum(DistributorType) type!: DistributorType;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
}
