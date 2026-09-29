import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';

// Shared by main.ts and the e2e tests so both run the app exactly the same way.
export function configureApp(app: INestApplication) {
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
  app.enableCors();
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('FixMate API')
    .setDescription('Home services marketplace API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
