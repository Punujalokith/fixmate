import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { memoryStorage } from 'multer';
import { FilePurpose } from '../generated/prisma/enums.js';
import { CurrentUser } from '../common/decorators/auth.decorators.js';
import type { AuthUser } from '../common/types/auth-user.js';
import { FilesService, type UploadedFileData } from './files.service.js';

class UploadFileDto {
  @ApiProperty({ enum: FilePurpose })
  @IsEnum(FilePurpose)
  purpose: FilePurpose;

  @ApiPropertyOptional({ format: 'uuid', description: 'Required for BOOKING_PHOTO / CHAT_ATTACHMENT' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

// Hard cap for multer; the per-environment MAX_UPLOAD_MB check happens in the service.
const MULTER_LIMIT_BYTES = 50 * 1024 * 1024;

@ApiTags('Files')
@ApiBearerAuth()
@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('files')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MULTER_LIMIT_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'purpose'],
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: { type: 'string', enum: Object.values(FilePurpose) },
        bookingId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image (returns its public URL)' })
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file: UploadedFileData | undefined, @Body() dto: UploadFileDto) {
    return this.files.upload(user, file, dto.purpose, dto.bookingId);
  }

  @Get('bookings/:id/files')
  @ApiOperation({ summary: 'Photos/documents attached to a booking' })
  forBooking(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.files.listForBooking(user, id);
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of my files' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.files.remove(user, id);
  }
}
