import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/auth.decorators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { ChatService, MAX_MESSAGE_LENGTH } from './chat.service.js';

class HistoryQueryDto {
  @ApiPropertyOptional({ description: 'Load messages older than this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;
}

class SendMessageDto {
  @ApiProperty({ example: 'Hi, I will arrive in 15 minutes.' })
  @IsString()
  @Length(1, MAX_MESSAGE_LENGTH)
  body: string;
}

// REST versions of the chat actions (the app mainly uses Socket.IO; these load history and act as fallback).
@ApiTags('Chat')
@ApiBearerAuth()
@Controller()
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('bookings/:id/messages')
  @ApiOperation({ summary: 'Chat history for a booking (newest first)' })
  history(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query() query: HistoryQueryDto) {
    return this.chat.history(user, id, query.before, query.limit);
  }

  @Post('bookings/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  send(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendMessageDto) {
    return this.chat.send(user, id, dto.body);
  }

  @Post('bookings/:id/messages/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark the other person’s messages as read' })
  markRead(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.chat.markRead(user, id);
  }

  @Get('chats/unread')
  @ApiOperation({ summary: 'Unread message counts per booking' })
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unreadSummary(user);
  }
}
