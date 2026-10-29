import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Service } from './service.entity';

@Entity('metric_collections')
@Index('idx_metric_collections_timestamp', ['timestamp'])
@Index('idx_metric_collections_service_id', ['service_id'])
@Index('idx_metric_collections_service_timestamp', [
  'service_id',
  'timestamp',
])
export class MetricCollection {
  @PrimaryGeneratedColumn('uuid')
  idCollections: string;

  @Column({
    type: 'uuid',
  })
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
  cpu_usage: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  memory_usage: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  storage_usage: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 6,
    nullable: true,
  })
  network_io: string | null;

  @Column({
    type: 'timestamptz',
  })
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
  energy_kwh: number | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  carbon_intensity_gco2e_per_kwh: string | null;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  co2e_g: string | null;

  @Column({
    type: 'boolean',
    nullable: true,
  })
  carbon_intensity_fallback: boolean | null;
}
