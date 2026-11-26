import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString,
  Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { PartnerStatus } from '../../generated/prisma/client';
import { IsEnum } from 'class-validator';

import { KYC_DOCUMENT_KINDS } from '../../uploads/uploads.constants';
import type { KycDocumentKind } from '../../uploads/uploads.constants';

export class KycDocumentDto {
  @IsIn([...KYC_DOCUMENT_KINDS]) kind!: KycDocumentKind;
  @IsString() @MaxLength(300) publicId!: string;
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
