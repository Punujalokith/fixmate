import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.module.js';
import { CurrentUser, Roles } from '../common/decorators/auth.decorators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { AdminService } from './admin.service.js';
import {
  AdminBookingsQueryDto,
  AdminBusinessesQueryDto,
  AdminReviewsQueryDto,
  AdminUsersQueryDto,
  AuditQueryDto,
  CreateCategoryDto,
  ModerateReviewDto,
  SetUserStatusDto,
  UpdateBusinessAdminDto,
  UpdateCategoryDto,
} from './dto/admin.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform overview for the dashboard' })
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users' })
  users(@Query() query: AdminUsersQueryDto) {
    return this.admin.users(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Suspend or re-activate a user' })
  setUserStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserStatusDto,
    @Req() req: Request,
  ) {
    return this.admin.setUserStatus(user, id, dto, req.ip);
  }

  @Get('businesses')
  @ApiOperation({ summary: 'Search businesses (unverified first)' })
  businesses(@Query() query: AdminBusinessesQueryDto) {
    return this.admin.businesses(query);
  }

  @Patch('businesses/:id')
  @ApiOperation({ summary: 'Verify / hide a business' })
  updateBusiness(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessAdminDto,
    @Req() req: Request,
  ) {
    return this.admin.updateBusiness(user, id, dto, req.ip);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'All bookings (cancel with POST /bookings/:id/cancel)' })
  bookings(@Query() query: AdminBookingsQueryDto) {
    return this.admin.bookings(query);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Reviews for moderation' })
  reviews(@Query() query: AdminReviewsQueryDto) {
    return this.admin.reviewsList(query);
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Hide or show a review (rating is recalculated)' })
  moderateReview(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
    @Req() req: Request,
  ) {
    return this.admin.moderateReview(user, id, dto.isHidden, req.ip);
  }

  @Get('categories')
  @ApiOperation({ summary: 'All categories including inactive' })
  categories() {
    return this.admin.listCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Add a category' })
  createCategory(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.admin.createCategory(user, dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Edit or deactivate a category' })
  updateCategory(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.admin.updateCategory(user, id, dto);
  }

  @Get('ai-usage')
  @ApiOperation({ summary: 'AI assistant requests, tokens and latency' })
  aiUsage() {
    return this.admin.aiUsage();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Who did what, and when' })
  auditLogs(@Query() query: AuditQueryDto) {
    return this.audit.list(query);
  }
}
