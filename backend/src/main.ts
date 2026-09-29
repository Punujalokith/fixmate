import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService);
  if (config.get('NODE_ENV') !== 'production') {
    setupSwagger(app);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`API ready on http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`Swagger docs on http://localhost:${port}/api/docs`, 'Bootstrap');
}
await bootstrap();
