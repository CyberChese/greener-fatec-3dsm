import { ApiProperty } from '@nestjs/swagger';

export class ServicesCountDto {
  @ApiProperty({ example: 4, description: 'Services with active metrics.' })
  active: number;

  @ApiProperty({ example: 1, description: 'Unavailable services.' })
  unavailable: number;

  @ApiProperty({ example: 2, description: 'Services without valid metrics.' })
  no_metrics: number;
}

export class MetricsSummaryDto {
  @ApiProperty({ example: 12.5, description: 'Total energy in kWh.' })
  total_energy_kwh: number;

  @ApiProperty({ example: 3.2, description: 'Total CO2e in kilograms.' })
  total_co2e_kg: number;

  @ApiProperty({ type: ServicesCountDto })
  services_count: ServicesCountDto;
}

export class CollectionConfigDto {
  @ApiProperty({ example: 30, description: 'Collection interval in seconds.' })
  interval_seconds: number;

  @ApiProperty({
    example: '2026-11-05T20:00:00.000Z',
    nullable: true,
    type: String,
    format: 'date-time',
  })
  last_collection_at: Date | null;
}
