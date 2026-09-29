import { Module } from '@nestjs/common';
import { BusinessesController, ProviderController, ServicesController } from './marketplace.controller.js';
import { MarketplaceService } from './marketplace.service.js';

@Module({
  controllers: [ServicesController, BusinessesController, ProviderController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
