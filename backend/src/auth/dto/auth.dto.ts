import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const PHONE_RULE = /^\+?[0-9]{9,15}$/;

export class RegisterDto {
  @ApiProperty({ example: 'nimal@example.com' })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Password123', description: '8-72 chars, at least one letter and one number' })
  @IsString()
  @Matches(PASSWORD_RULE, { message: 'Password must be 8-72 characters with at least one letter and one number' })
  password: string;

  @ApiProperty({ example: 'Nimal Perera' })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  fullName: string;

  @ApiPropertyOptional({ example: '+94771234567' })
  @IsOptional()
  @Transform(trim)
  @Matches(PHONE_RULE, { message: 'Phone must be 9-15 digits, optionally starting with +' })
  phone?: string;

  @ApiPropertyOptional({ enum: ['CUSTOMER', 'PROVIDER'], default: 'CUSTOMER' })
  @IsOptional()
  @IsIn(['CUSTOMER', 'PROVIDER'])
  role?: 'CUSTOMER' | 'PROVIDER';
}

export class LoginDto {
  @ApiProperty({ example: 'nimal@example.com' })
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(1)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
