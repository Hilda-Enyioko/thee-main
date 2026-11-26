import { BadRequestException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { IsIn, IsInt, Max, Min, validateSync } from 'class-validator';
import { DEVICE_CATEGORIES, MOTOR_CATEGORIES, Risk } from '../../adapters/provider-adapter';
import { IsMoney } from '../../common/dto/money';
import type { ProductType } from '../../generated/prisma/client';

export class MotorRiskDto {
  @IsIn([...MOTOR_CATEGORIES]) vehicleCategory!: (typeof MOTOR_CATEGORIES)[number];
  @IsMoney() vehicleValue!: string;
  @IsInt() @Min(1980) @Max(2100) yearOfManufacture!: number;
}

export class GadgetRiskDto {
  @IsIn([...DEVICE_CATEGORIES]) deviceCategory!: (typeof DEVICE_CATEGORIES)[number];
  @IsMoney() deviceValue!: string;
}

export function parseRisk(type: ProductType, raw: unknown): Risk {
  const cls: ClassConstructor<object> = type === 'MOTOR' ? MotorRiskDto : GadgetRiskDto;
  const instance = plainToInstance(cls, raw);
  const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) {
    throw new BadRequestException({
      error: 'Bad Request',
      message: errors.flatMap((e) => Object.values(e.constraints ?? {})),
    });
  }
  return { productType: type, ...instance } as Risk;
}
