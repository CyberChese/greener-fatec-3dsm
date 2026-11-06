import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Service } from './service.entity';

@Entity('metric_collections')
@Index('idx_metric_collections_service_timestamp', [
  'service_id',
  'timestamp',
])
@Index('idx_metric_collections_timestamp_totals', { synchronize: false })
export class MetricCollection {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ format: 'uuid' })
  idCollections: string;

  @Column({
    type: 'uuid',
  })
  @ApiProperty({ format: 'uuid' })
  service_id: string;

  @ManyToOne(() => Service, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'service_id',
    referencedColumnName: 'idServices',
    foreignKeyConstraintName: 'fk_metric_collections_service',
  })
  service: Service;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '42.500000', nullable: true })
  cpu_usage: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '2.100000', nullable: true })
  memory_usage: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '10.000000', nullable: true })
  storage_usage: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '0.300000', nullable: true })
  network_io: string | null;

  @Column({
    type: 'timestamptz',
  })
  @ApiProperty({ type: String, format: 'date-time' })
  timestamp: Date;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: number | null)=> value,
      from: (value: string | null) => (value === null ? null :parseFloat(value)),
    }
  })
  @ApiPropertyOptional({ example: 0.00042, nullable: true })
  energy_kwh: number | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '85.00000000', nullable: true })
  carbon_intensity_gco2e_per_kwh: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '0.03570000', nullable: true })
  co2e_g: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 11,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '0.00003570000', nullable: true })
  co2e_kg: string | null;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  @ApiPropertyOptional({ example: false, nullable: true })
  carbon_intensity_fallback: boolean | null;
}
