import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [BookingsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
