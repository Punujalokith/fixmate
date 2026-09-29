import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Job } from 'bullmq';
import { QUEUES } from '../queues.js';
import { BookingsService, type BookingTimerJob } from './bookings.service.js';

// Runs delayed jobs: "expire" (provider didn't answer) and "remind" (1 hour before the job).
@Processor(QUEUES.BOOKING_TIMERS)
export class BookingTimersProcessor extends WorkerHost {
  constructor(private readonly bookings: BookingsService) {
    super();
  }

  async process(job: Job<BookingTimerJob>) {
    if (job.name === 'expire') return { expired: await this.bookings.expireIfPending(job.data.bookingId) };
    if (job.name === 'remind') await this.bookings.sendReminder(job.data.bookingId);
    return {};
  }
}

// Scheduled job: every 5 minutes, catch any pending booking whose timer was lost.
@Injectable()
export class BookingSweeper {
  private readonly logger = new Logger(BookingSweeper.name);

  constructor(private readonly bookings: BookingsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'expire-stale-bookings' })
  async sweep() {
    const expired = await this.bookings.expireStale();
    if (expired) this.logger.log(`Expired ${expired} stale booking(s)`);
  }
}
