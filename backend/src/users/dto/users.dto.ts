import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { PASSWORD_RULE, PHONE_RULE } from '../../auth/dto/auth.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nimal Perera' })
  @IsOptional()
  @Transform(trim)
  @Length(2, 80)
  fullName?: string;

  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional()
  @Transform(trim)
  @Matches(PHONE_RULE, { message: 'Phone must be 9-15 digits, optionally starting with +' })
  phone?: string;

  @ApiPropertyOptional({ description: 'URL returned by POST /files' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: '8-72 chars, at least one letter and one number' })
  @Matches(PASSWORD_RULE, { message: 'Password must be 8-72 characters with at least one letter and one number' })
  newPassword: string;
}

export class CreateAddressDto {
  @ApiProperty({ example: 'Home' })
  @Transform(trim)
  @Length(1, 40)
  label: string;

  @ApiProperty({ example: '12 Temple Road' })
  @Transform(trim)
  @Length(3, 200)
  line1: string;

  @ApiPropertyOptional({ example: 'Near the post office' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(200)
  line2?: string;

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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

export class RegisterDeviceDto {
  @ApiProperty({ description: 'FCM token or Expo push token' })
  @IsString()
  @Length(10, 4096)
  token: string;

  @ApiProperty({ enum: ['android', 'ios', 'web'] })
  @IsIn(['android', 'ios', 'web'])
  platform: 'android' | 'ios' | 'web';
}
