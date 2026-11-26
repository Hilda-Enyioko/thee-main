import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { IsMoney } from '../../common/dto/money';
import { ProductStatus, ProductType } from '../../generated/prisma/client';

export class ProductTermsDto {
  @IsInt() @Min(1) @Max(36) durationMonths!: number;
  @IsOptional() @IsString() @MaxLength(2000) summary?: string;
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(300, { each: true })
  exclusions: string[] = [];
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(200, { each: true })
  claimDocuments: string[] = []; // the Phase 4 claim checklist
  @IsOptional() @IsInt() @Min(0) @Max(10000) excessBps?: number;
  @IsOptional() @IsInt() @Min(1) @Max(720) claimSlaHours?: number; // the Phase 4 SLA clock
}

export class CreateProductDto {
  @IsEnum(ProductType) type!: ProductType;
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,39}$/, { message: 'code must be 2-40 chars: A-Z, 0-9, _ or -' }) code!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ValidateNested() @Type(() => ProductTermsDto) terms!: ProductTermsDto;
  @IsOptional() @IsInt() @Min(0) @Max(10000) defaultCommissionBps?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @ValidateNested() @Type(() => ProductTermsDto) terms?: ProductTermsDto;
  @IsOptional() @IsInt() @Min(0) @Max(10000) defaultCommissionBps?: number;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}

export const PRICING_KINDS = ['FLAT', 'PERCENT_OF_VALUE'] as const;

export class PricingRuleDto {
  @IsIn([...PRICING_KINDS]) kind!: (typeof PRICING_KINDS)[number];
  @ValidateIf((o: PricingRuleDto) => o.kind === 'FLAT') @IsMoney() premium?: string;
  @ValidateIf((o: PricingRuleDto) => o.kind === 'PERCENT_OF_VALUE') @IsInt() @Min(1) @Max(10000) rateBps?: number;
  @ValidateIf((o: PricingRuleDto) => o.kind === 'PERCENT_OF_VALUE' && o.min !== undefined) @IsMoney() min?: string;
  @ValidateIf((o: PricingRuleDto) => o.kind === 'PERCENT_OF_VALUE' && o.max !== undefined) @IsMoney() max?: string;
}

export class CreatePlanDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsMoney() coverAmount!: string;
  @ValidateNested() @Type(() => PricingRuleDto) pricingRule!: PricingRuleDto;
  @IsOptional() @IsBoolean() installmentsOk?: boolean;
}

export class SetPlanActiveDto {
  @IsBoolean() active!: boolean;
}

export class QuoteDto {
  @IsObject() risk!: Record<string, unknown>;
}
