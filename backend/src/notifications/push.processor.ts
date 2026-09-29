import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUES } from '../queues.js';
import { PushMessage, PushService } from './push.service.js';

export interface PushJob extends PushMessage {
  userId: string;
}

// Background worker: takes push jobs off the Redis queue and delivers them.
// Failed jobs are retried automatically (see attempts/backoff where jobs are added).
@Processor(QUEUES.PUSH, { concurrency: 5 })
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {
    super();
  }

  async process(job: Job<PushJob>) {
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId: job.data.userId },
      select: { token: true },
    });
    if (!devices.length) return { sent: 0 };

    const { sent, invalidTokens } = await this.push.send(
      devices.map((d) => d.token),
      job.data,
    );
    if (invalidTokens.length) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
      this.logger.log(`Removed ${invalidTokens.length} expired device token(s)`);
    }
    return { sent };
  }
}
