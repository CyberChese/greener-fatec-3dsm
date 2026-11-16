import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function parseServiceIds(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : [item]))
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item !== '');
  }
  return value;
}

export class CompareQueryDto {
  @ApiProperty({
    type: [String],
    description: '2 to 4 service identifiers (UUID or external_id), comma-separated or repeated.',
    example: ['b9a3f744-1f9b-4e53-8b11-31d112a49c83', '6ea75d35-683d-45ed-8126-0d83bc3a89ca'],
  })
  @Transform(({ value }) => parseServiceIds(value))
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  serviceIds!: string[];

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 86400,
    default: 30,
    description: 'Time bucket size in seconds used to align collection timestamps across services.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(86_400)
  bucketSeconds = 30;
}
