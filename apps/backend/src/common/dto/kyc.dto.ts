import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString,
  Matches, Max, Min, ValidateNested,
} from 'class-validator';
import { PartnerStatus } from '../../generated/prisma/client';
import { IsEnum } from 'class-validator';

export class KycDocumentDto {
  @IsString() kind!: string; // e.g. CAC_CERTIFICATE, TAX_CLEARANCE, DIRECTOR_ID
  @IsString() publicId!: string;
}

export class SubmitKycDto {
  @IsObject() details!: Record<string, unknown>;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(15)
  @ValidateNested({ each: true }) @Type(() => KycDocumentDto)
  documents!: KycDocumentDto[];
}

export class ReviewKycDto {
  @IsIn(['APPROVED', 'REJECTED']) decision!: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() note?: string;
}

export class ReviewListQueryDto {
  @IsOptional() @IsEnum(PartnerStatus) status?: PartnerStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export class SettlementDto {
  @IsString() bankName!: string;
  @Matches(/^\d{10}$/, { message: 'accountNumber must be a 10-digit NUBAN' }) accountNumber!: string;
  @IsString() accountName!: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() tradingName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @ValidateNested() @Type(() => SettlementDto) settlement?: SettlementDto;
}
