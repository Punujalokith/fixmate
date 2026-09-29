import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QUEUES } from '../queues.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { PushProcessor } from './push.processor.js';
import { PushService } from './push.service.js';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.PUSH })],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, PushProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
