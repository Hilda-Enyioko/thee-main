import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class HealthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('HEALTH_CHECK_SECRET');
    if (!expected) {
      throw new UnauthorizedException('Health check secret not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-health-secret') ?? '';

    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);

    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      throw new UnauthorizedException('Invalid health check secret');
    }

    return true;
  }
}
