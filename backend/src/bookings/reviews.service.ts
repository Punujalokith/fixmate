import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReviewDto, ReviewReplyDto } from './dto/bookings.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(customerId: string, bookingId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true, business: { select: { ownerId: true } }, customer: { select: { fullName: true } } },
    });
    if (!booking || booking.customerId !== customerId) throw new NotFoundException('Booking not found');
    if (booking.status !== 'COMPLETED') throw new BadRequestException('You can review only completed jobs');
    if (booking.review) throw new ConflictException('You already reviewed this booking');

    const review = await this.prisma.review.create({
      data: { bookingId, customerId, businessId: booking.businessId, rating: dto.rating, comment: dto.comment },
    });
    await this.recalculateRating(booking.businessId);
    await this.notifications.notify({
      userId: booking.business.ownerId,
      type: 'NEW_REVIEW',
      title: `New ${dto.rating}★ review`,
      body: `${booking.customer.fullName}: ${dto.comment?.slice(0, 80) ?? 'No comment'}`,
      data: { bookingId, reviewId: review.id },
    });
    return review;
  }

  async reply(ownerId: string, bookingId: string, dto: ReviewReplyDto) {
    const review = await this.prisma.review.findUnique({
      where: { bookingId },
      include: { business: { select: { ownerId: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.business.ownerId !== ownerId) throw new ForbiddenException('This review is not about your business');
    return this.prisma.review.update({
      where: { id: review.id },
      data: { providerReply: dto.reply, repliedAt: new Date() },
    });
  }

  /** Average and count come from visible reviews only (admins can hide abusive ones). */
  async recalculateRating(businessId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { businessId, isHidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        ratingAvg: Math.round((stats._avg.rating ?? 0) * 10) / 10,
        ratingCount: stats._count._all,
      },
    });
  }
}
