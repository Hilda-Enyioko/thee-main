import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Service is up' })
  check() {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('db')
  @ApiOkResponse({ description: 'Database is reachable' })
  async db() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up' };
  }

  @Get('queue')
  @ApiOkResponse({ description: 'Redis is reachable' })
  async queue() {
    const redis = new Redis(
      this.configService.getOrThrow<string>('REDIS_URL'),
      {
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      },
    );

    redis.on('error', () => {});

    try {
      await redis.connect();
      const response = await redis.ping();

      if (response !== 'PONG') {
        throw new Error(`Unexpected Redis response: ${response}`);
      }

      return { status: 'ok', redis: 'up' };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        redis: 'down',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      redis.disconnect();
    }
  }
}
