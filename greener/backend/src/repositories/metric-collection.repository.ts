import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  type DeepPartial,
  type FindOperator,
} from 'typeorm';
import type { DateRange } from '../common/date-range';
import { MetricCollection } from '../entities/metric-collection.entity';

export interface ImpactTotals {
  energyKwh: number;
  co2eKg: number;
}

function timestampCondition(range: DateRange): FindOperator<Date> | undefined {
  if (range.from && range.to) {
    return Between(range.from, range.to);
  }
  if (range.from) {
    return MoreThanOrEqual(range.from);
  }
  if (range.to) {
    return LessThanOrEqual(range.to);
  }
  return undefined;
}

@Injectable()
export class MetricCollectionRepository {
  constructor(
    @InjectRepository(MetricCollection)
    private readonly repository: Repository<MetricCollection>,
  ) {}

  findById(idCollections: string): Promise<MetricCollection | null> {
    return this.repository.findOneBy({ idCollections });
  }

  save(collection: MetricCollection): Promise<MetricCollection> {
    return this.repository.save(collection);
  }

  createAndSave(data: DeepPartial<MetricCollection>): Promise<MetricCollection> {
    return this.repository.save(this.repository.create(data));
  }

  async findLatestTimestamp(): Promise<Date | null> {
    const [latest] = await this.repository.find({
      select: { timestamp: true },
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return latest?.timestamp ?? null;
  }

  async sumImpact(): Promise<ImpactTotals> {
    const totals = await this.repository
      .createQueryBuilder('collection')
      .select('COALESCE(SUM(collection.energy_kwh), 0)', 'total_energy_kwh')
      .addSelect('COALESCE(SUM(collection.co2e_kg), 0)', 'total_co2e_kg')
      .getRawOne<{
        total_energy_kwh: string | number | null;
        total_co2e_kg: string | number | null;
      }>();

    return {
      energyKwh: Number(totals?.total_energy_kwh ?? 0),
      co2eKg: Number(totals?.total_co2e_kg ?? 0),
    };
  }

  findByService(serviceId: string, range: DateRange): Promise<MetricCollection[]> {
    const timestamp = timestampCondition(range);
    return this.repository.find({
      where: timestamp ? { service_id: serviceId, timestamp } : { service_id: serviceId },
      order: { timestamp: 'ASC' },
    });
  }

  findByServices(serviceIds: string[], range: DateRange): Promise<MetricCollection[]> {
    const timestamp = timestampCondition(range);
    const service_id = In(serviceIds);
    return this.repository.find({
      where: timestamp ? { service_id, timestamp } : { service_id },
      order: { timestamp: 'ASC' },
    });
  }
}
