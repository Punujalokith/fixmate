import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'node:path';
import { BookingsModule } from '../bookings/bookings.module.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { StorageService } from './storage.service.js';

@Module({
  imports: [
    BookingsModule,
    // Serve saved uploads as static files at /uploads/...
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          rootPath: resolve(config.get<string>('UPLOAD_DIR', 'uploads')),
          serveRoot: '/uploads',
          serveStaticOptions: { index: false, fallthrough: false, maxAge: '7d' },
        },
      ],
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
})
export class FilesModule {}
