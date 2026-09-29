import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BookingStatus } from '../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: '2026-10-05T04:30:00.000Z', description: 'When the job should start (ISO date)' })
  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;

  @ApiPropertyOptional({ format: 'uuid', description: 'One of my saved addresses. Or send addressLine + city.' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiPropertyOptional({ example: '12 Temple Road' })
  @IsOptional()
  @Transform(trim)
  @Length(3, 200)
  addressLine?: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional()
  @Transform(trim)
  @Length(2, 80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Kitchen sink is leaking under the cabinet.' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(1000)
  notes?: string;
}

export class BookingActionDto {
  @ApiPropertyOptional({ description: 'Reason (required when cancelling or rejecting)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ListBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsIn(Object.values(BookingStatus))
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: ['active', 'history'], description: 'active = pending/accepted/in progress' })
  @IsOptional()
  @IsIn(['active', 'history'])
  scope?: 'active' | 'history';
}

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Arrived on time and fixed the leak quickly.' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(1000)
  comment?: string;
}

export class ReviewReplyDto {
  @ApiProperty({ example: 'Thank you! Happy to help anytime.' })
  @Transform(trim)
  @Length(1, 1000)
  reply: string;
}
