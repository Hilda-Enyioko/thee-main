import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

export const IsMoney = () =>
  applyDecorators(
    Matches(/^\d{1,13}(\.\d{1,2})?$/, {
      message: '$property must be a decimal string with at most 2 places, for example "150000.00"',
    }),
  );
