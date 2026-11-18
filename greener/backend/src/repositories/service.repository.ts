import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type FindOptionsWhere } from 'typeorm';
import type { DateRange } from '../common/date-range';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ImpactMetric = 'energy' | 'co2e';

export type ServiceUpsertRow = Pick<
  Service,
  | 'external_id'
  | 'nameServices'
  | 'endpoint'
  | 'region_code'
  | 'status'
  | 'country'
  | 'region'
  | 'city'
  | 'latitude'
  | 'longitude'
  | 'last_observed_at'
>;

export interface ImpactRankingQuery extends DateRange {
  metric: ImpactMetric;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface ImpactRankingRow {
  service_id: string;
  external_id: string;
  name: string;
  status: ServiceStatus;
  metric_value: number;
}

export type ServiceStatusCount = Record<ServiceStatus, number>;

const METRIC_COLUMNS: Record<ImpactMetric, string> = {
  energy: 'collection.energy_kwh',
  co2e: 'collection.co2e_kg',
};

@Injectable()
export class ServiceRepository {
  constructor(
    @InjectRepository(Service)
    private readonly repository: Repository<Service>,
  ) {}

  findAll(): Promise<Service[]> {
    return this.repository.find();
  }

  findById(idServices: string): Promise<Service | null> {
    return this.repository.findOneBy({ idServices });
  }

  findByIdentifiers(identifiers: string[]): Promise<Service[]> {
    const uuids = identifiers.filter((id) => UUID_REGEX.test(id));
    const where: FindOptionsWhere<Service>[] = [
      { external_id: In(identifiers) },
    ];
    if (uuids.length > 0) {
      where.unshift({ idServices: In(uuids) });
    }
    return this.repository.find({ where });
  }

  count(): Promise<number> {
    return this.repository.count();
  }

  async countByStatus(): Promise<ServiceStatusCount> {
    const rows = await this.repository
      .createQueryBuilder('service')
      .select('service.status', 'status')
      .addSelect('COUNT(service.idServices)', 'count')
      .groupBy('service.status')
      .getRawMany<{ status: ServiceStatus; count: string | number }>();

    const counts: ServiceStatusCount = {
      [ServiceStatus.ACTIVE]: 0,
      [ServiceStatus.UNAVAILABLE]: 0,
      [ServiceStatus.NO_METRICS]: 0,
    };
    for (const row of rows) {
      if (row.status in counts) {
        counts[row.status] = Number(row.count);
      }
    }
    return counts;
  }

  async updateStatus(idServices: string, status: ServiceStatus): Promise<void> {
    await this.repository.update({ idServices }, { status });
  }

  async upsertByExternalId(rows: ServiceUpsertRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await this.repository.upsert(rows, ['external_id']);
  }

  async markUnavailableExcept(externalIds: string[]): Promise<void> {
    const query = this.repository
      .createQueryBuilder()
      .update(Service)
      .set({ status: ServiceStatus.UNAVAILABLE });

    if (externalIds.length > 0) {
      query.where('"external_id" NOT IN (:...externalIds)', { externalIds });
    }

    await query.execute();
  }

  async findImpactRanking(query: ImpactRankingQuery): Promise<ImpactRankingRow[]> {
    const joinConditions = ['collection.service_id = service.idServices'];
    const parameters: Record<string, Date> = {};
    if (query.from) {
      joinConditions.push('collection.timestamp >= :startDate');
      parameters.startDate = query.from;
    }
    if (query.to) {
      joinConditions.push('collection.timestamp <= :endDate');
      parameters.endDate = query.to;
    }

    const rows = await this.repository
      .createQueryBuilder('service')
      .leftJoin(
        MetricCollection,
        'collection',
        joinConditions.join(' AND '),
        parameters,
      )
      .select('service.idServices', 'service_id')
      .addSelect('service.external_id', 'external_id')
      .addSelect('service.nameServices', 'name')
      .addSelect('service.status', 'status')
      .addSelect(
        `COALESCE(SUM(${METRIC_COLUMNS[query.metric]}), 0)`,
        'metric_value',
      )
      .groupBy('service.idServices')
      .addGroupBy('service.external_id')
      .addGroupBy('service.nameServices')
      .addGroupBy('service.status')
      .orderBy('metric_value', query.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('service.nameServices', 'ASC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<Omit<ImpactRankingRow, 'metric_value'> & {
        metric_value: string | number;
      }>();

    return rows.map((row) => ({ ...row, metric_value: Number(row.metric_value) }));
  }
}
