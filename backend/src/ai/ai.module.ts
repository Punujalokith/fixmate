import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { MarketplaceModule } from '../marketplace/marketplace.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  imports: [CategoriesModule, MarketplaceModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
