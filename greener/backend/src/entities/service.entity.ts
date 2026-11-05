import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ServiceStatus {
  ACTIVE = 'ACTIVE',
  UNAVAILABLE = 'UNAVAILABLE',
  NO_METRICS = 'NO_METRICS',
}

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ format: 'uuid', example: 'b9a3f744-1f9b-4e53-8b11-31d112a49c83' })
  idServices: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  @ApiProperty({ example: 'billing-api' })
  external_id: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  @ApiProperty({ example: 'Billing API' })
  nameServices: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '/metrics/billing-api', nullable: true })
  endpoint: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @ApiPropertyOptional({ example: 'br-sudeste', nullable: true })
  region_code: string | null;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    enumName: 'service_status',
    default: ServiceStatus.NO_METRICS,
  })
  @ApiProperty({ enum: ServiceStatus, example: ServiceStatus.ACTIVE })
  status: ServiceStatus;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @ApiPropertyOptional({ example: 'Brazil', nullable: true })
  country: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @ApiPropertyOptional({ example: 'Southeast', nullable: true })
  region: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @ApiPropertyOptional({ example: 'Sao Paulo', nullable: true })
  city: string | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '-23.550500', nullable: true })
  latitude: string | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
  })
  @ApiPropertyOptional({ example: '-46.633300', nullable: true })
  longitude: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  @ApiProperty({ type: String, format: 'date-time' })
  create_at: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  last_observed_at: Date | null;
}
