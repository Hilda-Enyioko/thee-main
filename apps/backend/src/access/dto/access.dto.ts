import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { GrantStatus } from '../../generated/prisma/client';

export class RequestAccessDto {
  @IsUUID() productId!: string;
}

export class ReviewGrantDto {
  @IsIn(['APPROVED', 'REJECTED']) decision!: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsInt() @Min(0) @Max(10000) commissionBps?: number; // falls back to the product default
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class RevokeGrantDto {
  @IsString() @MinLength(3) @MaxLength(500) note!: string;
}

export class GrantListQueryDto {
  @IsOptional() @IsEnum(GrantStatus) status?: GrantStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export class StaffGrantListQueryDto extends GrantListQueryDto {
  @IsOptional() @IsUUID() providerId?: string;
  @IsOptional() @IsUUID() distributorId?: string;
}
