import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/auth.decorators.js';

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check that the API and database are running' })
  checkHealth() {
    return this.appService.checkHealth();
  }
}
