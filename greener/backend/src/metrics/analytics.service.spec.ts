import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Service } from '../entities/service.entity';
import { AnalyticsService } from './analytics.service';
import { RankingQueryDto } from './dto/ranking-query.dto';

describe('AnalyticsService', () => {
  let analytics: AnalyticsService;
  let services: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    queryBuilder = {};
    for (const method of ['leftJoin', 'select', 'addSelect', 'groupBy', 'addGroupBy', 'orderBy', 'addOrderBy', 'offset', 'limit']) {
      queryBuilder[method] = jest.fn().mockReturnValue(queryBuilder);
    }
    queryBuilder.getRawMany = jest.fn().mockResolvedValue([
      { service_id: 'service-1', external_id: 'billing', name: 'Billing', status: 'ACTIVE', metric_value: '1.25' },
    ]);
    services = { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder), count: jest.fn().mockResolvedValue(12) };
    analytics = new AnalyticsService(services as unknown as Repository<Service>);
  });

  it.each([
    ['energy', 'collection.energy_kwh'],
    ['co2e', 'collection.co2e_kg'],
  ] as const)('ranks by %s in the requested direction with database pagination', async (metric, column) => {
    const result = await analytics.getRanking({
      metric,
      order: 'desc',
      page: 2,
      limit: 5,
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-10T00:00:00.000Z',
    } as RankingQueryDto);

    expect(queryBuilder.addSelect).toHaveBeenCalledWith(`COALESCE(SUM(${column}), 0)`, 'metric_value');
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('metric_value', 'DESC');
    expect(queryBuilder.offset).toHaveBeenCalledWith(5);
    expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    expect(queryBuilder.leftJoin).toHaveBeenCalledWith(
      expect.anything(),
      'collection',
      expect.stringContaining('collection.timestamp >= :startDate'),
      { startDate: new Date('2026-11-01T00:00:00.000Z'), endDate: new Date('2026-11-10T00:00:00.000Z') },
    );
    expect(result.items[0].metric_value).toBe(1.25);
    expect(result.pagination).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3 });
  });

  it('rejects invalid date values', async () => {
    await expect(analytics.getRanking({ startDate: 'invalid' } as RankingQueryDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a start date later than the end date', async () => {
    await expect(analytics.getRanking({
      startDate: '2026-11-10T00:00:00.000Z',
      endDate: '2026-11-01T00:00:00.000Z',
    } as RankingQueryDto)).rejects.toBeInstanceOf(BadRequestException);
  });
});
