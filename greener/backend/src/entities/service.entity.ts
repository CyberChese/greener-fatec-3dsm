import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ServiceStatus {
  ACTIVE = 'ACTIVE',
  UNAVAILABLE = 'UNAVAILABLE',
  NO_METRICS = 'NO_METRICS',
}

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  idServices: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  external_id: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nameServices: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  endpoint: string;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    enumName: 'service_status',
    default: ServiceStatus.NO_METRICS,
  })
  status: ServiceStatus;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  country: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  region: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  city: string | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
  })
  latitude: string | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
  })
  longitude: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  create_at: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  last_observed_at: Date | null;
}