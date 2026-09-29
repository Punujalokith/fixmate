import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { StorageService } from './storage.service.js';

// Uploaded files are served at /uploads/... by configureApp() (see app.setup.ts).
@Module({
  imports: [BookingsModule],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
})
export class FilesModule {}
