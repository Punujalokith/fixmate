import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { NotificationType, Prisma } from '../generated/prisma/client.js';
import { PaginationQueryDto, pageArgs, paginated } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUES } from '../queues.js';
import { RealtimeService, SERVER_EVENTS } from '../realtime/realtime.service.js';
import type { PushJob } from './push.processor.js';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    @InjectQueue(QUEUES.PUSH) private readonly pushQueue: Queue<PushJob>,
  ) {}

  /** Save in the notification list, show it live in the app, and queue a phone push. */
  async notify(input: NotifyInput) {
    const notification = await this.prisma.notification.create({
      data: { userId: input.userId, type: input.type, title: input.title, body: input.body, data: input.data as Prisma.InputJsonValue },
    });
    this.realtime.emitToUser(input.userId, SERVER_EVENTS.NOTIFICATION_NEW, notification);
    await this.queuePush({ userId: input.userId, title: input.title, body: input.body, data: { ...input.data, type: input.type } });
    return notification;
  }

  /** Push only (no saved notification) — used for chat messages. */
  async queuePush(job: PushJob) {
    try {
      await this.pushQueue.add('push', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      });
    } catch (error) {
      // Redis down: the in-app notification was still saved, so don't fail the request.
      this.logger.error(`Could not queue push: ${(error as Error).message}`);
    }
  }

  async list(userId: string, query: PaginationQueryDto) {
    const where = { userId };
    const [data, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(query) }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { ...paginated(data, total, query), unread };
  }

  async unreadCount(userId: string) {
    return { unread: await this.prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0 && !(await this.prisma.notification.findFirst({ where: { id, userId } }))) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  }
}
