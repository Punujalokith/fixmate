import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/decorators/auth.decorators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { BookingsService } from './bookings.service.js';
import {
  BookingActionDto,
  CreateBookingDto,
  CreateReviewDto,
  ListBookingsQueryDto,
  ReviewReplyDto,
} from './dto/bookings.dto.js';
import { ReviewsService } from './reviews.service.js';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly reviews: ReviewsService,
  ) {}

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Book a service' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My bookings (customer: mine, provider: my business, admin: all)' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListBookingsQueryDto) {
    return this.bookings.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Booking details with status timeline and allowed actions' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.getForUser(user, id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider accepts a pending booking' })
  accept(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.act(user, id, 'accept');
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider declines a pending booking (reason required)' })
  reject(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BookingActionDto) {
    return this.bookings.act(user, id, 'reject', dto.reason);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider starts the job' })
  start(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.act(user, id, 'start');
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider completes the job (cash marked as paid)' })
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.act(user, id, 'complete');
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (reason required)' })
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: BookingActionDto) {
    return this.bookings.act(user, id, 'cancel', dto.reason);
  }

  @Post(':id/review')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Review a completed booking' })
  review(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, id, dto);
  }

  @Post(':id/review/reply')
  @Roles('PROVIDER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provider replies to the review' })
  reply(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewReplyDto) {
    return this.reviews.reply(user.id, id, dto);
  }
}
