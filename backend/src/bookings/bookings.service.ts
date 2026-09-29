import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { randomInt } from 'node:crypto';
import { Prisma, type BookingStatus, type NotificationType } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.module.js';
import { pageArgs, paginated } from '../common/dto/pagination.dto.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { fitsAvailability } from '../marketplace/availability.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUES } from '../queues.js';
import { RealtimeService, SERVER_EVENTS } from '../realtime/realtime.service.js';
import { contactUserSelect } from '../users/user.select.js';
import {
  ACTION_TARGET,
  ACTIVE_STATUSES,
  FINAL_STATUSES,
  type Actor,
  type BookingAction,
  allowedActions,
  canTransition,
  isLateCancel,
} from './booking-state.js';
import type { CreateBookingDto, ListBookingsQueryDto } from './dto/bookings.dto.js';

export interface BookingTimerJob {
  bookingId: string;
}

const bookingInclude = {
  business: { select: { id: true, name: true, ownerId: true, logoUrl: true, phone: true, city: true, ratingAvg: true } },
  customer: { select: contactUserSelect },
  service: { select: { id: true, durationMinutes: true, imageUrl: true, category: { select: { name: true, slug: true, icon: true } } } },
  payment: true,
  review: true,
} satisfies Prisma.BookingInclude;

type LoadedBooking = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I/L confusion

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly audit: AuditService,
    @InjectQueue(QUEUES.BOOKING_TIMERS) private readonly timers: Queue<BookingTimerJob>,
  ) {}

  // ─────────────── Create ───────────────

  async create(customerId: string, dto: CreateBookingDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, isActive: true, business: { isActive: true, owner: { status: 'ACTIVE' } } },
      include: { business: { include: { availability: true } } },
    });
    if (!service) throw new NotFoundException('Service not found or no longer available');
    if (service.business.ownerId === customerId) throw new BadRequestException('You cannot book your own service');

    // When: not in the past, not too soon, not too far, inside working hours.
    const leadMinutes = this.config.get<number>('BOOKING_MIN_LEAD_MINUTES', 60);
    const earliest = new Date(Date.now() + leadMinutes * 60_000);
    if (dto.scheduledAt < earliest) {
      throw new BadRequestException(`Please book at least ${leadMinutes} minutes in advance`);
    }
    if (dto.scheduledAt.getTime() > Date.now() + 60 * 24 * 60 * 60_000) {
      throw new BadRequestException('Bookings can be made up to 60 days ahead');
    }
    const timeZone = this.config.get<string>('BUSINESS_TIMEZONE', 'Asia/Colombo');
    if (!fitsAvailability(service.business.availability, dto.scheduledAt, service.durationMinutes, timeZone)) {
      throw new BadRequestException('The provider is not working at that time. Check their working hours.');
    }

    // Where: a saved address or one typed in.
    const place = await this.resolveAddress(customerId, dto);

    const booking = await this.withUniqueCode((code) =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.booking.create({
          data: {
            code,
            customerId,
            businessId: service.businessId,
            serviceId: service.id,
            scheduledAt: dto.scheduledAt,
            serviceTitle: service.title,
            priceType: service.priceType,
            price: service.price,
            notes: dto.notes,
            ...place,
          },
        });
        await tx.bookingStatusHistory.create({
          data: { bookingId: created.id, fromStatus: null, toStatus: 'PENDING', changedById: customerId },
        });
        await tx.payment.create({ data: { bookingId: created.id, amount: service.price, method: 'CASH' } });
        return created;
      }),
    );

    const loaded = await this.load(booking.id);
    await this.scheduleExpiry(loaded.id);
    const customer = loaded.customer.fullName;
    await this.notifications.notify({
      userId: loaded.business.ownerId,
      type: 'BOOKING_CREATED',
      title: 'New booking request',
      body: `${customer} requested "${loaded.serviceTitle}" on ${this.formatWhen(loaded.scheduledAt)}.`,
      data: { bookingId: loaded.id },
    });
    this.broadcast(loaded);
    return this.present(loaded, 'CUSTOMER');
  }

  // ─────────────── Read ───────────────

  async list(user: AuthUser, query: ListBookingsQueryDto) {
    const where: Prisma.BookingWhereInput = {
      ...(user.role === 'CUSTOMER' && { customerId: user.id }),
      ...(user.role === 'PROVIDER' && { business: { ownerId: user.id } }),
      ...(query.status && { status: query.status }),
      ...(query.scope === 'active' && { status: { in: ACTIVE_STATUSES } }),
      ...(query.scope === 'history' && { status: { in: FINAL_STATUSES } }),
    };
    const orderBy: Prisma.BookingOrderByWithRelationInput =
      query.scope === 'active' ? { scheduledAt: 'asc' } : { createdAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({ where, orderBy, include: bookingInclude, ...pageArgs(query) }),
      this.prisma.booking.count({ where }),
    ]);
    return paginated(
      data.map((b) => this.present(b, this.actorFor(user, b))),
      total,
      query,
    );
  }

  async getForUser(user: AuthUser, id: string) {
    const booking = await this.loadForParticipant(user, id);
    const statusHistory = await this.prisma.bookingStatusHistory.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'asc' },
      include: { changedBy: { select: { fullName: true, role: true } } },
    });
    return { ...this.present(booking, this.actorFor(user, booking)), statusHistory };
  }

  /** Throws unless the user is this booking's customer, its provider, or an admin. */
  async loadForParticipant(user: AuthUser, id: string) {
    const booking = await this.load(id);
    const isParticipant = booking.customerId === user.id || booking.business.ownerId === user.id;
    if (!isParticipant && user.role !== 'ADMIN') throw new NotFoundException('Booking not found');
    return booking;
  }

  // ─────────────── Status changes ───────────────

  async act(user: AuthUser, id: string, action: Exclude<BookingAction, 'expire'>, reason?: string) {
    const booking = await this.loadForParticipant(user, id);
    const actor = this.actorFor(user, booking);
    const to = ACTION_TARGET[action];

    if (!canTransition(booking.status, to, actor)) {
      const anyoneCan = (['CUSTOMER', 'PROVIDER', 'ADMIN'] as Actor[]).some((a) => canTransition(booking.status, to, a));
      if (anyoneCan) throw new ForbiddenException(`You cannot ${action} this booking`);
      throw new ConflictException(`A ${booking.status.toLowerCase().replace('_', ' ')} booking cannot be ${to.toLowerCase()}`);
    }
    if ((action === 'cancel' || action === 'reject') && !reason) {
      throw new BadRequestException('Please give a reason');
    }
    if (action === 'cancel' && actor === 'CUSTOMER' && booking.status === 'ACCEPTED') {
      const hours = this.config.get<number>('BOOKING_LATE_CANCEL_HOURS', 2);
      if (isLateCancel(booking.scheduledAt, new Date(), hours)) {
        throw new BadRequestException(`Accepted bookings can't be cancelled less than ${hours} hours before the start. Please message the provider.`);
      }
    }
    if (action === 'accept') await this.assertNoClash(booking);

    const updated = await this.applyTransition(booking, to, user.id, actor, reason);
    if (actor === 'ADMIN') {
      await this.audit.log({ actorId: user.id, action: `booking.${action}`, entityType: 'Booking', entityId: id, metadata: { reason } });
    }
    return this.getForUser(user, updated.id);
  }

  /** Called by the background timer: expire if the provider never answered. */
  async expireIfPending(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
    if (!booking || booking.status !== 'PENDING') return false;
    await this.applyTransition(booking, 'EXPIRED', null, 'SYSTEM', 'Provider did not respond in time');
    return true;
  }

  /** Called by the background timer 1 hour before the job. */
  async sendReminder(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });
    if (!booking || booking.status !== 'ACCEPTED') return;
    const when = this.formatWhen(booking.scheduledAt);
    await Promise.all([
      this.notifications.notify({
        userId: booking.customerId,
        type: 'BOOKING_REMINDER',
        title: 'Upcoming booking',
        body: `${booking.business.name} is coming for "${booking.serviceTitle}" at ${when}.`,
        data: { bookingId },
      }),
      this.notifications.notify({
        userId: booking.business.ownerId,
        type: 'BOOKING_REMINDER',
        title: 'Job starting soon',
        body: `"${booking.serviceTitle}" for ${booking.customer.fullName} at ${when}.`,
        data: { bookingId },
      }),
    ]);
  }

  /** Safety net for lost timers: expire every stale PENDING booking. */
  async expireStale() {
    const timeout = this.config.get<number>('BOOKING_ACCEPT_TIMEOUT_MINUTES', 30);
    const stale = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        OR: [{ createdAt: { lt: new Date(Date.now() - timeout * 60_000) } }, { scheduledAt: { lt: new Date() } }],
      },
      select: { id: true },
      take: 100,
    });
    let expired = 0;
    for (const { id } of stale) if (await this.expireIfPending(id)) expired++;
    return expired;
  }

  private async applyTransition(
    booking: LoadedBooking,
    to: BookingStatus,
    changedById: string | null,
    actor: Actor,
    note?: string,
  ) {
    const now = new Date();
    const stamps: Prisma.BookingUpdateManyMutationInput = {
      ACCEPTED: { acceptedAt: now },
      IN_PROGRESS: { startedAt: now },
      COMPLETED: { completedAt: now },
      CANCELLED: { cancelledAt: now, cancelReason: note, cancelledByRole: actor === 'SYSTEM' ? null : actor },
      REJECTED: { cancelledAt: now, cancelReason: note },
      EXPIRED: { cancelledAt: now, cancelReason: note },
    }[to as Exclude<BookingStatus, 'PENDING'>];

    await this.prisma.$transaction(async (tx) => {
      // Only update if nobody changed the status meanwhile (optimistic locking).
      const result = await tx.booking.updateMany({
        where: { id: booking.id, status: booking.status },
        data: { status: to, ...stamps },
      });
      if (result.count === 0) throw new ConflictException('This booking was just updated by someone else. Please refresh.');

      await tx.bookingStatusHistory.create({
        data: { bookingId: booking.id, fromStatus: booking.status, toStatus: to, changedById, note },
      });
      if (to === 'COMPLETED') {
        await tx.payment.update({ where: { bookingId: booking.id }, data: { status: 'PAID', paidAt: now } });
        await tx.business.update({ where: { id: booking.businessId }, data: { completedJobs: { increment: 1 } } });
      }
    });

    await this.afterTransition(booking, to, actor);
    return this.load(booking.id);
  }

  private async afterTransition(booking: LoadedBooking, to: BookingStatus, actor: Actor) {
    // Timers
    if (to === 'ACCEPTED') await this.scheduleReminder(booking.id, booking.scheduledAt);
    if (FINAL_STATUSES.includes(to) || to === 'ACCEPTED') await this.removeTimer(`expire-${booking.id}`);
    if (FINAL_STATUSES.includes(to)) await this.removeTimer(`remind-${booking.id}`);

    // Notifications to the other side
    const biz = booking.business.name;
    const title = booking.serviceTitle;
    const toCustomer = (type: NotificationType, head: string, body: string) =>
      this.notifications.notify({ userId: booking.customerId, type, title: head, body, data: { bookingId: booking.id } });
    const toProvider = (type: NotificationType, head: string, body: string) =>
      this.notifications.notify({ userId: booking.business.ownerId, type, title: head, body, data: { bookingId: booking.id } });

    try {
      switch (to) {
        case 'ACCEPTED':
          await toCustomer('BOOKING_ACCEPTED', 'Booking accepted', `${biz} accepted "${title}" for ${this.formatWhen(booking.scheduledAt)}.`);
          break;
        case 'REJECTED':
          await toCustomer('BOOKING_REJECTED', 'Booking declined', `${biz} can't take "${title}". Try another provider.`);
          break;
        case 'IN_PROGRESS':
          await toCustomer('BOOKING_STARTED', 'Job started', `${biz} has started "${title}".`);
          break;
        case 'COMPLETED':
          await toCustomer('BOOKING_COMPLETED', 'Job completed', `"${title}" is done. How did ${biz} do? Leave a review.`);
          break;
        case 'CANCELLED':
          if (actor !== 'CUSTOMER') await toCustomer('BOOKING_CANCELLED', 'Booking cancelled', `"${title}" with ${biz} was cancelled.`);
          if (actor !== 'PROVIDER') await toProvider('BOOKING_CANCELLED', 'Booking cancelled', `${booking.customer.fullName} cancelled "${title}".`);
          break;
        case 'EXPIRED':
          await toCustomer('BOOKING_EXPIRED', 'No response from provider', `${biz} didn't respond in time. Try another provider.`);
          await toProvider('BOOKING_EXPIRED', 'Booking request expired', `You missed "${title}" from ${booking.customer.fullName}.`);
          break;
      }
    } catch (error) {
      this.logger.error(`Notification failed for booking ${booking.id}: ${(error as Error).message}`);
    }

    this.broadcast({ ...booking, status: to });
  }

  // ─────────────── Timers (BullMQ delayed jobs) ───────────────

  private async scheduleExpiry(bookingId: string) {
    const minutes = this.config.get<number>('BOOKING_ACCEPT_TIMEOUT_MINUTES', 30);
    await this.addTimer('expire', `expire-${bookingId}`, bookingId, minutes * 60_000);
  }

  private async scheduleReminder(bookingId: string, scheduledAt: Date) {
    const delay = scheduledAt.getTime() - 60 * 60_000 - Date.now();
    if (delay > 0) await this.addTimer('remind', `remind-${bookingId}`, bookingId, delay);
  }

  private async addTimer(name: string, jobId: string, bookingId: string, delay: number) {
    try {
      await this.timers.add(name, { bookingId }, { jobId, delay, removeOnComplete: true, removeOnFail: 100, attempts: 3 });
    } catch (error) {
      // The cron sweeper will still expire it, so just log.
      this.logger.error(`Could not schedule ${jobId}: ${(error as Error).message}`);
    }
  }

  private async removeTimer(jobId: string) {
    try {
      await this.timers.remove(jobId);
    } catch {
      // Job already ran or is running — nothing to do.
    }
  }

  // ─────────────── Helpers ───────────────

  private async assertNoClash(booking: LoadedBooking) {
    const start = booking.scheduledAt.getTime();
    const end = start + booking.service.durationMinutes * 60_000;
    const nearby = await this.prisma.booking.findMany({
      where: {
        businessId: booking.businessId,
        id: { not: booking.id },
        status: { in: ['ACCEPTED', 'IN_PROGRESS'] },
        scheduledAt: { gte: new Date(start - 24 * 60 * 60_000), lt: new Date(end) },
      },
      include: { service: { select: { durationMinutes: true } } },
    });
    const clash = nearby.find((o) => {
      const oStart = o.scheduledAt.getTime();
      return oStart < end && oStart + o.service.durationMinutes * 60_000 > start;
    });
    if (clash) throw new ConflictException(`You already have booking ${clash.code} at that time`);
  }

  private async resolveAddress(customerId: string, dto: CreateBookingDto) {
    if (dto.addressId) {
      const address = await this.prisma.address.findFirst({ where: { id: dto.addressId, userId: customerId } });
      if (!address) throw new NotFoundException('Address not found');
      return {
        addressLine: [address.line1, address.line2].filter(Boolean).join(', '),
        city: address.city,
        latitude: address.latitude,
        longitude: address.longitude,
      };
    }
    if (!dto.addressLine || !dto.city) throw new BadRequestException('Choose a saved address or enter addressLine and city');
    return { addressLine: dto.addressLine, city: dto.city, latitude: dto.latitude, longitude: dto.longitude };
  }

  private async withUniqueCode<T>(create: (code: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = 'FM-' + Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
      try {
        return await create(code);
      } catch (error) {
        const isCodeClash =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          JSON.stringify(error.meta ?? {}).includes('code');
        if (!isCodeClash) throw error;
      }
    }
    throw new ConflictException('Could not create booking, please try again');
  }

  private load(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include: bookingInclude }).then((b) => {
      if (!b) throw new NotFoundException('Booking not found');
      return b;
    });
  }

  private actorFor(user: AuthUser, booking: { customerId: string; business: { ownerId: string } }): Actor {
    if (booking.customerId === user.id) return 'CUSTOMER';
    if (booking.business.ownerId === user.id) return 'PROVIDER';
    return 'ADMIN';
  }

  /** Adds the buttons this user may press right now. */
  private present(booking: LoadedBooking, actor: Actor) {
    return {
      ...booking,
      actions: allowedActions(booking.status, actor),
      canReview: actor === 'CUSTOMER' && booking.status === 'COMPLETED' && !booking.review,
    };
  }

  private broadcast(booking: { id: string; code: string; status: BookingStatus; customerId: string; business: { ownerId: string } }) {
    this.realtime.emitToUsers([booking.customerId, booking.business.ownerId], SERVER_EVENTS.BOOKING_UPDATED, {
      id: booking.id,
      code: booking.code,
      status: booking.status,
    });
  }

  private formatWhen(date: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: this.config.get<string>('BUSINESS_TIMEZONE', 'Asia/Colombo'),
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }
}
