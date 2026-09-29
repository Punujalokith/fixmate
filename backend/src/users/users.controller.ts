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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/auth.decorators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  ChangePasswordDto,
  CreateAddressDto,
  RegisterDeviceDto,
  UpdateAddressDto,
  UpdateProfileDto,
} from './dto/users.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch()
  @ApiOperation({ summary: 'Update my profile' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Post('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change my password (logs out other devices)' })
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.id, dto);
  }

  // ── Addresses ──

  @Get('addresses')
  @ApiOperation({ summary: 'List my saved addresses' })
  listAddresses(@CurrentUser() user: AuthUser) {
    return this.users.listAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Save a new address' })
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.users.createAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Edit an address' })
  updateAddress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.users.updateAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  async deleteAddress(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.users.deleteAddress(user.id, id);
  }

  // ── Favourites ──

  @Get('favourites')
  @ApiOperation({ summary: 'List my favourite providers' })
  listFavourites(@CurrentUser() user: AuthUser) {
    return this.users.listFavourites(user.id);
  }

  @Post('favourites/:businessId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a provider to favourites' })
  async addFavourite(@CurrentUser() user: AuthUser, @Param('businessId', ParseUUIDPipe) businessId: string) {
    await this.users.addFavourite(user.id, businessId);
  }

  @Delete('favourites/:businessId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a provider from favourites' })
  async removeFavourite(@CurrentUser() user: AuthUser, @Param('businessId', ParseUUIDPipe) businessId: string) {
    await this.users.removeFavourite(user.id, businessId);
  }

  // ── Devices ──

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register this phone for push notifications' })
  async registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    await this.users.registerDevice(user.id, dto);
  }

  @Delete('devices/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Stop push notifications to this phone' })
  async removeDevice(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    await this.users.removeDevice(user.id, token);
  }
}
