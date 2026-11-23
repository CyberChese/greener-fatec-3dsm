import { ApiProperty } from '@nestjs/swagger';
import { ServiceStatus } from '../../entities/service.entity';

export class RankingItemDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({
    format: 'uuid',
    example: 'b9a3f744-1f9b-4e53-8b11-31d112a49c83',
  })
  service_id!: string;

  @ApiProperty({ example: 'billing-api' })
  external_id!: string;

  @ApiProperty({ example: 'Billing API' })
  name!: string;

  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.ACTIVE })
  status!: ServiceStatus;

  @ApiProperty({
    example: 0.04692212,
    description: 'Energy in kWh or CO2e in kilograms, according to metric.',
  })
  metric_value!: number;
}

export class RankingPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 24 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class RankingResponseDto {
  @ApiProperty({ enum: ['energy', 'co2e'], example: 'co2e' })
  metric!: 'energy' | 'co2e';

  @ApiProperty({ enum: ['asc', 'desc'], example: 'desc' })
  order!: 'asc' | 'desc';

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-11-16T12:00:00.000Z',
  })
  startDate!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-11-16T13:00:00.000Z',
  })
  endDate!: string | null;

  @ApiProperty({ type: [RankingItemDto] })
  items!: RankingItemDto[];

  @ApiProperty({ type: RankingPaginationDto })
  pagination!: RankingPaginationDto;
}

export class CompareMetricPointDto {
  @ApiProperty({ type: Number, nullable: true, example: 70 })
  cpu_usage!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.0008 })
  energy_kwh!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.0004 })
  co2e_kg!: number | null;
}

export class CompareServiceSummaryDto {
  @ApiProperty({
    format: 'uuid',
    example: 'b9a3f744-1f9b-4e53-8b11-31d112a49c83',
  })
  service_id!: string;

  @ApiProperty({ example: 'billing-api' })
  external_id!: string;

  @ApiProperty({ example: 'Billing API' })
  name!: string;

  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.ACTIVE })
  status!: ServiceStatus;

  @ApiProperty({ example: 2 })
  samples_count!: number;

  @ApiProperty({ type: Number, nullable: true, example: 70 })
  avg_cpu_usage!: number | null;

  @ApiProperty({ example: 0.0014 })
  total_energy_kwh!: number;

  @ApiProperty({ example: 0.0007 })
  total_co2e_kg!: number;
}

export class CompareSeriesPointDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-11-16T12:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    type: 'object',
    description:
      'One metric point for each compared service, keyed by internal service UUID.',
    additionalProperties: {
      $ref: '#/components/schemas/CompareMetricPointDto',
    },
  })
  values!: Record<string, CompareMetricPointDto>;
}

export class CompareStatisticalSummaryDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: 'b9a3f744-1f9b-4e53-8b11-31d112a49c83',
  })
  most_polluting_service_id!: string | null;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: '6ea75d35-683d-45ed-8126-0d83bc3a89ca',
  })
  least_polluting_service_id!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.0007 })
  most_polluting_co2e_kg!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.00028 })
  least_polluting_co2e_kg!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 0.00042 })
  co2e_difference_kg!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 60 })
  efficiency_difference_percent!: number | null;
}

export class CompareResponseDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-11-16T12:00:00.000Z',
  })
  startDate!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-11-16T12:01:00.000Z',
  })
  endDate!: string | null;

  @ApiProperty({ example: 30, description: 'Time bucket size in seconds.' })
  bucketSeconds!: number;

  @ApiProperty({ type: [CompareServiceSummaryDto] })
  services!: CompareServiceSummaryDto[];

  @ApiProperty({ type: [CompareSeriesPointDto] })
  series!: CompareSeriesPointDto[];

  @ApiProperty({ type: CompareStatisticalSummaryDto })
  summary!: CompareStatisticalSummaryDto;
}
