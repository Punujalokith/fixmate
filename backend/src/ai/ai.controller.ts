import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../common/decorators/auth.decorators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { AiService } from './ai.service.js';
import { AssistRequestDto } from './dto/ai.dto.js';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('assist')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // AI calls cost money: max 10 per minute
  @ApiOperation({ summary: 'Describe a problem; get the right service, urgency, questions and providers' })
  assist(@CurrentUser() user: AuthUser, @Body() dto: AssistRequestDto) {
    return this.ai.assist(user.id, dto);
  }

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Is the AI model connected (or using the keyword fallback)?' })
  status() {
    return { mode: this.ai.enabled ? 'ai' : 'fallback' };
  }
}
