import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PriceType } from '../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { PHONE_RULE } from '../../auth/dto/auth.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

// ── Business ──

export class CreateBusinessDto {
  @ApiProperty({ example: 'Perera Plumbing Services' })
  @Transform(trim)
  @Length(3, 100)
  name: string;

  @ApiPropertyOptional({ example: '15 years of experience fixing leaks and bathroom fittings.' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional()
  @Matches(PHONE_RULE, { message: 'Phone must be 9-15 digits, optionally starting with +' })
  phone?: string;

  @ApiPropertyOptional({ example: '45 Galle Road' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(200)
  addressLine?: string;

  @ApiProperty({ example: 'Colombo' })
  @Transform(trim)
  @Length(2, 80)
  city: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(80)
  district?: string;

  @ApiPropertyOptional({ example: 6.9271 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 79.8612 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: 15, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  serviceRadiusKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  coverUrl?: string;
}

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}

export class AvailabilitySlotDto {
  @ApiProperty({ description: '0 = Sunday ... 6 = Saturday', example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: 'Minutes from midnight (9:00 = 540)', example: 540 })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @ApiProperty({ description: 'Minutes from midnight (17:30 = 1050)', example: 1050 })
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  @ArrayMaxSize(50)
  slots: AvailabilitySlotDto[];
}

// ── Service ──

export class CreateServiceDto {
  @ApiProperty({ example: 'Kitchen sink leak repair' })
  @Transform(trim)
  @Length(3, 120)
  title: string;

  @ApiPropertyOptional({ example: 'Fix leaking taps, pipes and sink drains.' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ enum: PriceType, example: PriceType.FIXED })
  @IsEnum(PriceType)
  priceType: PriceType;

  @ApiProperty({ example: 3500, description: 'LKR' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  price: number;

  @ApiPropertyOptional({ example: 60, default: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(24 * 60)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Search ──

export const SERVICE_SORTS = ['relevance', 'price_asc', 'price_desc', 'rating', 'newest'] as const;
export type ServiceSort = (typeof SERVICE_SORTS)[number];

export class SearchServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Free text: "sink leak", "AC"...' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Category slug, e.g. "plumbing"' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Colombo' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Only verified providers' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ enum: SERVICE_SORTS, default: 'relevance' })
  @IsOptional()
  @IsIn(SERVICE_SORTS)
  sort: ServiceSort = 'relevance';
}

export class SearchBusinessesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ enum: ['rating', 'jobs', 'newest'], default: 'rating' })
  @IsOptional()
  @IsIn(['rating', 'jobs', 'newest'])
  sort: 'rating' | 'jobs' | 'newest' = 'rating';
}
