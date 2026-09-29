import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsIn, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ChatTurnDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class AssistRequestDto {
  @ApiProperty({ example: 'My washing machine is making a loud banging noise when it spins.' })
  @Transform(trim)
  @Length(3, 1000)
  message: string;

  @ApiPropertyOptional({ type: [ChatTurnDto], description: 'Earlier turns, so the assistant can use your answers to its questions' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  @ArrayMaxSize(10)
  history?: ChatTurnDto[];

  @ApiPropertyOptional({ example: 'Colombo', description: 'Used to find nearby providers' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(80)
  city?: string;
}
