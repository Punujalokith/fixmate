import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '../common/decorators/auth.decorators.js';
import { PaginationQueryDto } from '../common/dto/pagination.dto.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  CreateBusinessDto,
  CreateServiceDto,
  SearchBusinessesQueryDto,
  SearchServicesQueryDto,
  SetAvailabilityDto,
  UpdateBusinessDto,
  UpdateServiceDto,
} from './dto/marketplace.dto.js';
import { MarketplaceService } from './marketplace.service.js';

// ── Public browsing (no login needed) ──

@ApiTags('Services')
@Public()
@Controller('services')
export class ServicesController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  @ApiOperation({ summary: 'Search services with filters, sorting and pagination' })
  search(@Query() query: SearchServicesQueryDto) {
    return this.marketplace.searchServices(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one service' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketplace.getService(id);
  }
}

@ApiTags('Businesses')
@Public()
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  @ApiOperation({ summary: 'Search providers' })
  search(@Query() query: SearchBusinessesQueryDto) {
    return this.marketplace.searchBusinesses(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Provider profile with services and working hours' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthUser) {
    return this.marketplace.getBusiness(id, user?.id);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Reviews of a provider, with star breakdown' })
  reviews(@Param('id', ParseUUIDPipe) id: string, @Query() query: PaginationQueryDto) {
    return this.marketplace.listReviews(id, query);
  }
}

// ── Provider-only management ──

@ApiTags('Provider')
@ApiBearerAuth()
@Roles('PROVIDER')
@Controller('provider')
export class ProviderController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Post('business')
  @ApiOperation({ summary: 'Create my business profile' })
  createBusiness(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessDto) {
    return this.marketplace.createBusiness(user.id, dto);
  }

  @Get('business')
  @ApiOperation({ summary: 'Get my business with all services (including hidden)' })
  myBusiness(@CurrentUser() user: AuthUser) {
    return this.marketplace.myBusiness(user.id);
  }

  @Patch('business')
  @ApiOperation({ summary: 'Update my business profile' })
  updateBusiness(@CurrentUser() user: AuthUser, @Body() dto: UpdateBusinessDto) {
    return this.marketplace.updateBusiness(user.id, dto);
  }

  @Put('business/availability')
  @ApiOperation({ summary: 'Replace my weekly working hours' })
  setAvailability(@CurrentUser() user: AuthUser, @Body() dto: SetAvailabilityDto) {
    return this.marketplace.setAvailability(user.id, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Earnings, booking counts and upcoming jobs' })
  dashboard(@CurrentUser() user: AuthUser) {
    return this.marketplace.dashboard(user.id);
  }

  @Post('services')
  @ApiOperation({ summary: 'Add a service' })
  createService(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceDto) {
    return this.marketplace.createService(user.id, dto);
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Edit a service' })
  updateService(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.marketplace.updateService(user.id, id, dto);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hide a service (kept for booking history)' })
  async deleteService(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.marketplace.deleteService(user.id, id);
  }
}
