import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';

// Shared by main.ts and the e2e tests so both run the app exactly the same way.
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);

  // All routes live under /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip fields that are not in the DTO
      forbidNonWhitelisted: true, // reject requests with unknown fields
      transform: true, // convert query strings to numbers/booleans per DTO types
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  const origins = config.get<string>('CORS_ORIGINS', '*');
  app.enableCors({ origin: origins === '*' ? true : origins.split(',').map((o) => o.trim()) });
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('FixMate API')
    .setDescription(
      'Home services marketplace API.\n\n' +
        '1. Call **POST /auth/login** (or register).\n' +
        '2. Copy `accessToken` and click **Authorize**.\n' +
        'Real-time events use Socket.IO on the same host (auth: `{ token: accessToken }`).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, { swaggerOptions: { persistAuthorization: true } });
}
