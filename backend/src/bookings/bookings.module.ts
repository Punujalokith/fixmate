import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../queues.js';
import { BookingSweeper, BookingTimersProcessor } from './booking-timers.processor.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.BOOKING_TIMERS })],
  controllers: [BookingsController],
  providers: [BookingsService, ReviewsService, BookingTimersProcessor, BookingSweeper],
  exports: [BookingsService, ReviewsService],
})
export class BookingsModule {}
