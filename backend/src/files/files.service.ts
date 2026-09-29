import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { FilePurpose } from '../generated/prisma/client.js';
import { BookingsService } from '../bookings/bookings.service.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from './storage.service.js';

// Allowed types, recognised by their first bytes ("magic numbers"), not the file name.
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-' },
];
const PDF_ALLOWED: FilePurpose[] = ['CHAT_ATTACHMENT', 'BOOKING_PHOTO'];

export interface UploadedFileData {
  buffer: Buffer;
  size: number;
  originalname: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly bookings: BookingsService,
    private readonly config: ConfigService,
  ) {}

  async upload(user: AuthUser, file: UploadedFileData | undefined, purpose: FilePurpose, bookingId?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Attach a file in the "file" field');
    const maxMb = this.config.get<number>('MAX_UPLOAD_MB', 5);
    if (file.size > maxMb * 1024 * 1024) throw new BadRequestException(`File is larger than ${maxMb} MB`);

    const type = SIGNATURES.find((s) => s.test(file.buffer));
    if (!type) throw new BadRequestException('Only JPEG, PNG, WEBP images (or PDF for booking documents) are allowed');
    if (type.mime === 'application/pdf' && !PDF_ALLOWED.includes(purpose)) {
      throw new BadRequestException('PDF is only allowed for booking documents');
    }

    if (purpose === 'BOOKING_PHOTO' || purpose === 'CHAT_ATTACHMENT') {
      if (!bookingId) throw new BadRequestException('bookingId is required for booking files');
      await this.bookings.loadForParticipant(user, bookingId);
    }
    if ((purpose === 'BUSINESS_LOGO' || purpose === 'BUSINESS_COVER' || purpose === 'SERVICE_IMAGE') && user.role !== 'PROVIDER') {
      throw new BadRequestException('Only providers can upload business images');
    }

    const now = new Date();
    const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${type.ext}`;
    const stored = await this.storage.save(key, file.buffer);

    return this.prisma.file.create({
      data: {
        ownerId: user.id,
        purpose,
        url: stored.url,
        storageKey: stored.key,
        mimeType: type.mime,
        sizeBytes: file.size,
        bookingId: bookingId ?? null,
      },
    });
  }

  listForBooking(user: AuthUser, bookingId: string) {
    return this.bookings.loadForParticipant(user, bookingId).then(() =>
      this.prisma.file.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' } }),
    );
  }

  async remove(user: AuthUser, id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file || (file.ownerId !== user.id && user.role !== 'ADMIN')) throw new NotFoundException('File not found');
    await this.prisma.file.delete({ where: { id } });
    await this.storage.remove(file.storageKey);
  }
}
