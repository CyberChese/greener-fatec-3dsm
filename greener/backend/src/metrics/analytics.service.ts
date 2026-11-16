import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service } from '../entities/service.entity';
import { RankingQueryDto } from './dto/ranking-query.dto';

export interface RankingItem {
  rank: number;
  service_id: string;
  external_id: string;
  name: string;
  status: Service['status'];
  metric_value: number;
}

export interface RankingResult {
  metric: 'energy' | 'co2e';
  order: 'asc' | 'desc';
  startDate: string | null;
  endDate: string | null;
  items: RankingItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async getRanking(query: RankingQueryDto): Promise<RankingResult> {
    const startDate = this.parseDate(query.startDate, 'startDate');
    const endDate = this.parseDate(query.endDate, 'endDate');
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('"startDate" must be earlier than or equal to "endDate".');
    }

    // Names are selected from a fixed allowlist; query values remain bound parameters.
    const metricColumn = query.metric === 'energy' ? 'collection.energy_kwh' : 'collection.co2e_kg';
    const joinConditions = ['collection.service_id = service.idServices'];
    const parameters: Record<string, Date> = {};
    if (startDate) {
      joinConditions.push('collection.timestamp >= :startDate');
      parameters.startDate = startDate;
    }
    if (endDate) {
      joinConditions.push('collection.timestamp <= :endDate');
      parameters.endDate = endDate;
    }

    const [rows, total] = await Promise.all([
      this.serviceRepository
        .createQueryBuilder('service')
        .leftJoin(MetricCollection, 'collection', joinConditions.join(' AND '), parameters)
        .select('service.idServices', 'service_id')
        .addSelect('service.external_id', 'external_id')
        .addSelect('service.nameServices', 'name')
        .addSelect('service.status', 'status')
        .addSelect(`COALESCE(SUM(${metricColumn}), 0)`, 'metric_value')
        .groupBy('service.idServices')
        .addGroupBy('service.external_id')
        .addGroupBy('service.nameServices')
        .addGroupBy('service.status')
        .orderBy('metric_value', query.order.toUpperCase() as 'ASC' | 'DESC')
        .addOrderBy('service.nameServices', 'ASC')
        .offset((query.page - 1) * query.limit)
        .limit(query.limit)
        .getRawMany<{
          service_id: string;
          external_id: string;
          name: string;
          status: Service['status'];
          metric_value: string | number;
        }>(),
      this.serviceRepository.count(),
    ]);

    return {
      metric: query.metric,
      order: query.order,
      startDate: query.startDate ?? null,
      endDate: query.endDate ?? null,
      items: rows.map((row, index) => ({
        rank: (query.page - 1) * query.limit + index + 1,
        ...row,
        metric_value: Number(row.metric_value),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private parseDate(value: string | undefined, name: string): Date | undefined {
    if (value === undefined) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Query parameter "${name}" must be a valid date.`);
    }
    return date;
  }
}
