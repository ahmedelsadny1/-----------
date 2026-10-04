// ============================================
// Backend Entry Point — NestJS + Fastify
// ============================================

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3000);
  const host = configService.get<string>('API_HOST', '0.0.0.0');

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS — allow Electron desktop and admin web
  app.enableCors({
    origin: [
      'http://localhost:5173', // Admin web dev
      'http://localhost:5174', // Backup
      'app://-',              // Electron
    ],
    credentials: true,
  });

  await app.listen(port, host);
  logger.log(`🚀 Server running on http://${host}:${port}/api/v1`);
  logger.log(`📋 Health check: http://${host}:${port}/api/v1/health`);
}

bootstrap();
