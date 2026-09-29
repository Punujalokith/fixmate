import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { TokensService } from '../auth/tokens.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ChangePasswordDto,
  CreateAddressDto,
  RegisterDeviceDto,
  UpdateAddressDto,
  UpdateProfileDto,
} from './dto/users.dto.js';
import { publicUserSelect } from './user.select.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  // ── Profile ──

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.phone) {
      const taken = await this.prisma.user.findFirst({ where: { phone: dto.phone, NOT: { id: userId } } });
      if (taken) throw new ConflictException('Phone is already registered');
    }
    return this.prisma.user.update({ where: { id: userId }, data: dto, select: publicUserSelect });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    // Log out every other device: old refresh tokens stop working.
    await this.tokens.revokeAllForUser(userId);
  }

  // ── Addresses ──

  listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault || count === 0; // first address becomes the default
    return this.prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, userId, isDefault } });
    });
  }

  async updateAddress(userId: string, id: string, dto: UpdateAddressDto) {
    await this.ownAddress(userId, id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: dto });
    });
  }

  async deleteAddress(userId: string, id: string) {
    const address = await this.ownAddress(userId, id);
    await this.prisma.address.delete({ where: { id } });
    if (address.isDefault) {
      const next = await this.prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
      if (next) await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  async ownAddress(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  // ── Favourites ──

  async listFavourites(userId: string) {
    const favourites = await this.prisma.favourite.findMany({
      where: { userId, business: { isActive: true } },
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: { id: true, name: true, city: true, logoUrl: true, ratingAvg: true, ratingCount: true, isVerified: true },
        },
      },
    });
    return favourites.map((f) => ({ ...f.business, favouritedAt: f.createdAt }));
  }

  async addFavourite(userId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({ where: { id: businessId, isActive: true } });
    if (!business) throw new NotFoundException('Business not found');
    await this.prisma.favourite.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId },
      update: {},
    });
  }

  async removeFavourite(userId: string, businessId: string) {
    await this.prisma.favourite.deleteMany({ where: { userId, businessId } });
  }

  // ── Push notification devices ──

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    // A token belongs to one phone; if another account logs in on that phone, move it over.
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform: dto.platform },
      update: { userId, platform: dto.platform, lastSeenAt: new Date() },
    });
  }

  async removeDevice(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
  }
}
