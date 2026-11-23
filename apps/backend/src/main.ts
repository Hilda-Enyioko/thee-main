import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());

  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // Versioned API; /health stays at the root for Render's health check
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // reject them instead of silently ignoring
      transform: true, // turn payloads into DTO instances
    }),
  );

  // Let Nest close DB and Redis connections cleanly on SIGTERM (Render deploys)
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('TheeInsurance API')
        .setDescription('MVP1: Motor and Gadget')
        .setVersion('1.0')
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  // 0.0.0.0 so Render can reach the container
  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
