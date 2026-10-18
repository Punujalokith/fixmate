import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const config = app.get(ConfigService);
  const swagger = config.get('NODE_ENV') !== 'production' || config.get<boolean>('ENABLE_SWAGGER');
  if (swagger) setupSwagger(app);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  const base = config.get<string>('PUBLIC_BASE_URL', `http://localhost:${port}`);
  Logger.log(`API ready on ${base}/api/v1`, 'Bootstrap');
  if (swagger) Logger.log(`Swagger docs on ${base}/api/docs`, 'Bootstrap');
}
await bootstrap();
