import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { BookingStatus, Role, UserStatus } from '../../generated/prisma/enums.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search name or email' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsIn(Object.values(Role))
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsIn(Object.values(UserStatus))
  status?: UserStatus;
}

export class SetUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsIn(Object.values(UserStatus))
  status: UserStatus;

  @ApiPropertyOptional({ example: 'Repeated no-shows reported by customers' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(500)
  reason?: string;
}

export class AdminBusinessesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  verified?: boolean;
}

export class UpdateBusinessAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminBookingsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Booking code, e.g. FM-7K3Q9P' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsIn(Object.values(BookingStatus))
  status?: BookingStatus;
}

export class AdminReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  hidden?: boolean;

  @ApiPropertyOptional({ description: 'Only reviews with this rating or lower' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  maxRating?: number;
}

export class ModerateReviewDto {
  @ApiProperty()
  @IsBoolean()
  isHidden: boolean;
}

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'user.suspend' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'User' })
  @IsOptional()
  @IsString()
  entityType?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Gardening' })
  @Transform(trim)
  @Length(2, 60)
  name: string;

  @ApiProperty({ example: 'gardening' })
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'slug must be lowercase words joined by dashes' })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ example: 'leaf', description: 'Ionicons icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
