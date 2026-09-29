import { BadRequestException, Injectable } from '@nestjs/common';
import type { BookingStatus } from '../generated/prisma/client.js';
import { BookingsService } from '../bookings/bookings.service.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeService, SERVER_EVENTS } from '../realtime/realtime.service.js';

// Chat stays open while the job is active and for follow-ups after completion.
const CHAT_OPEN: BookingStatus[] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
export const MAX_MESSAGE_LENGTH = 2000;

const senderSelect = { select: { id: true, fullName: true, avatarUrl: true } } as const;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Newest first. Pass `before` (ISO date of the oldest message you have) to load older ones. */
  async history(user: AuthUser, bookingId: string, before?: Date, limit = 30) {
    await this.bookings.loadForParticipant(user, bookingId);
    const messages = await this.prisma.message.findMany({
      where: { bookingId, ...(before && { createdAt: { lt: before } }) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: { sender: senderSelect },
    });
    return { data: messages, hasMore: messages.length === limit };
  }

  async send(user: AuthUser, bookingId: string, rawBody: string) {
    const body = rawBody?.trim();
    if (!body) throw new BadRequestException('Message is empty');
    if (body.length > MAX_MESSAGE_LENGTH) throw new BadRequestException(`Message is longer than ${MAX_MESSAGE_LENGTH} characters`);

    const booking = await this.bookings.loadForParticipant(user, bookingId);
    const participants = [booking.customerId, booking.business.ownerId];
    if (!participants.includes(user.id)) throw new BadRequestException('Only the customer and provider can chat');
    if (!CHAT_OPEN.includes(booking.status)) throw new BadRequestException('Chat is closed for this booking');

    const message = await this.prisma.message.create({
      data: { bookingId, senderId: user.id, body },
      include: { sender: senderSelect },
    });
    this.realtime.emitToUsers(participants, SERVER_EVENTS.MESSAGE_NEW, message);

    // Push only if the other person doesn't have the app open.
    const recipientId = participants.find((id) => id !== user.id)!;
    if (!(await this.realtime.isOnline(recipientId))) {
      const senderName = user.id === booking.customerId ? booking.customer.fullName : booking.business.name;
      await this.notifications.queuePush({
        userId: recipientId,
        title: senderName,
        body: body.length > 100 ? `${body.slice(0, 97)}...` : body,
        data: { type: 'NEW_MESSAGE', bookingId },
      });
    }
    return message;
  }

  async markRead(user: AuthUser, bookingId: string) {
    const booking = await this.bookings.loadForParticipant(user, bookingId);
    const readAt = new Date();
    const { count } = await this.prisma.message.updateMany({
      where: { bookingId, senderId: { not: user.id }, readAt: null },
      data: { readAt },
    });
    if (count) {
      this.realtime.emitToUsers([booking.customerId, booking.business.ownerId], SERVER_EVENTS.MESSAGE_READ, {
        bookingId,
        readerId: user.id,
        readAt,
      });
    }
    return { updated: count };
  }

  async typing(user: AuthUser, bookingId: string, isTyping: boolean) {
    const booking = await this.bookings.loadForParticipant(user, bookingId);
    const otherId = user.id === booking.customerId ? booking.business.ownerId : booking.customerId;
    this.realtime.emitToUser(otherId, SERVER_EVENTS.TYPING, { bookingId, userId: user.id, isTyping });
  }

  /** Unread message count per booking for the chat list badges. */
  async unreadSummary(user: AuthUser) {
    const rows = await this.prisma.message.groupBy({
      by: ['bookingId'],
      where: {
        readAt: null,
        senderId: { not: user.id },
        booking: user.role === 'PROVIDER' ? { business: { ownerId: user.id } } : { customerId: user.id },
      },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.bookingId, r._count._all]));
  }
}
