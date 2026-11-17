import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import { AnalyticsService } from './analytics.service';
import { CompareQueryDto } from './dto/compare-query.dto';
import { RankingQueryDto } from './dto/ranking-query.dto';

describe('AnalyticsService', () => {
  let analytics: AnalyticsService;
  let services: {
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
    find: jest.Mock;
  };
  let collections: { find: jest.Mock };
  let queryBuilder: Record<string, jest.Mock>;

  beforeEach(() => {
    queryBuilder = {};
    for (const method of ['leftJoin', 'select', 'addSelect', 'groupBy', 'addGroupBy', 'orderBy', 'addOrderBy', 'offset', 'limit']) {
      queryBuilder[method] = jest.fn().mockReturnValue(queryBuilder);
    }
    queryBuilder.getRawMany = jest.fn().mockResolvedValue([
      { service_id: 'service-1', external_id: 'billing', name: 'Billing', status: 'ACTIVE', metric_value: '1.25' },
    ]);
    services = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      count: jest.fn().mockResolvedValue(12),
      find: jest.fn().mockResolvedValue([]),
    };
    collections = {
      find: jest.fn().mockResolvedValue([]),
    };
    analytics = new AnalyticsService(
      services as unknown as Repository<Service>,
      collections as unknown as Repository<MetricCollection>,
    );
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

  describe('compareServices', () => {
    const serviceA = {
      idServices: '11111111-1111-4111-8111-111111111111',
      external_id: 'billing-api',
      nameServices: 'Billing API',
      status: ServiceStatus.ACTIVE,
    } as Service;

    const serviceB = {
      idServices: '22222222-2222-4222-8222-222222222222',
      external_id: 'auth-api',
      nameServices: 'Auth API',
      status: ServiceStatus.ACTIVE,
    } as Service;

    const serviceCUnavailable = {
      idServices: '33333333-3333-4333-8333-333333333333',
      external_id: 'search-api',
      nameServices: 'Search API',
      status: ServiceStatus.UNAVAILABLE,
    } as Service;

    it('returns temporally aligned paired series (CPU, kWh, CO2e) and efficiency summary for active services', async () => {
      services.find.mockResolvedValue([serviceA, serviceB]);
      collections.find.mockResolvedValue([
        {
          service_id: serviceA.idServices,
          cpu_usage: '80.000000',
          energy_kwh: 0.0008,
          co2e_kg: '0.00040000000',
          timestamp: new Date('2026-11-16T12:00:02.100Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: '20.000000',
          energy_kwh: 0.0002,
          co2e_kg: '0.00010000000',
          timestamp: new Date('2026-11-16T12:00:05.450Z'),
        },
        {
          service_id: serviceA.idServices,
          cpu_usage: '60.000000',
          energy_kwh: 0.0006,
          co2e_kg: '0.00030000000',
          timestamp: new Date('2026-11-16T12:00:31.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: '30.000000',
          energy_kwh: 0.0003,
          co2e_kg: '0.00018000000',
          timestamp: new Date('2026-11-16T12:00:34.900Z'),
        },
      ]);

      const result = await analytics.compareServices({
        serviceIds: [serviceA.idServices, serviceB.idServices],
        startDate: '2026-11-16T12:00:00.000Z',
        endDate: '2026-11-16T12:01:00.000Z',
        bucketSeconds: 30,
      });

      expect(result.series).toEqual([
        {
          timestamp: '2026-11-16T12:00:00.000Z',
          values: {
            [serviceA.idServices]: {
              cpu_usage: 80,
              energy_kwh: 0.0008,
              co2e_kg: 0.0004,
            },
            [serviceB.idServices]: {
              cpu_usage: 20,
              energy_kwh: 0.0002,
              co2e_kg: 0.0001,
            },
          },
        },
        {
          timestamp: '2026-11-16T12:00:30.000Z',
          values: {
            [serviceA.idServices]: {
              cpu_usage: 60,
              energy_kwh: 0.0006,
              co2e_kg: 0.0003,
            },
            [serviceB.idServices]: {
              cpu_usage: 30,
              energy_kwh: 0.0003,
              co2e_kg: 0.00018,
            },
          },
        },
      ]);

      expect(result.services).toEqual([
        {
          service_id: serviceA.idServices,
          external_id: 'billing-api',
          name: 'Billing API',
          status: ServiceStatus.ACTIVE,
          samples_count: 2,
          avg_cpu_usage: 70,
          total_energy_kwh: 0.0014,
          total_co2e_kg: 0.0007,
        },
        {
          service_id: serviceB.idServices,
          external_id: 'auth-api',
          name: 'Auth API',
          status: ServiceStatus.ACTIVE,
          samples_count: 2,
          avg_cpu_usage: 25,
          total_energy_kwh: 0.0005,
          total_co2e_kg: 0.00028,
        },
      ]);

      // (0.0007 - 0.00028) / 0.0007 * 100 = 60%
      expect(result.summary).toEqual({
        most_polluting_service_id: serviceA.idServices,
        least_polluting_service_id: serviceB.idServices,
        most_polluting_co2e_kg: 0.0007,
        least_polluting_co2e_kg: 0.00028,
        co2e_difference_kg: 0.00042,
        efficiency_difference_percent: 60,
      });
    });

    it('compares active services with a temporarily unavailable (UNAVAILABLE) service, filling missing buckets with null', async () => {
      services.find.mockResolvedValue([serviceA, serviceB, serviceCUnavailable]);
      collections.find.mockResolvedValue([
        // Bucket 1 (12:00:00): all 3 services collected before serviceC became UNAVAILABLE
        {
          service_id: serviceA.idServices,
          cpu_usage: '50.000000',
          energy_kwh: 0.0005,
          co2e_kg: '0.00050000000',
          timestamp: new Date('2026-11-16T12:00:01.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: '25.000000',
          energy_kwh: 0.00025,
          co2e_kg: '0.00010000000',
          timestamp: new Date('2026-11-16T12:00:02.000Z'),
        },
        {
          service_id: serviceCUnavailable.idServices,
          cpu_usage: '40.000000',
          energy_kwh: 0.0004,
          co2e_kg: '0.00025000000',
          timestamp: new Date('2026-11-16T12:00:03.000Z'),
        },
        // Bucket 2 (12:00:30): serviceC is UNAVAILABLE and has no collection
        {
          service_id: serviceA.idServices,
          cpu_usage: '50.000000',
          energy_kwh: 0.0005,
          co2e_kg: '0.00050000000',
          timestamp: new Date('2026-11-16T12:00:31.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: '25.000000',
          energy_kwh: 0.00025,
          co2e_kg: '0.00010000000',
          timestamp: new Date('2026-11-16T12:00:32.000Z'),
        },
      ]);

      const result = await analytics.compareServices({
        serviceIds: [
          serviceA.idServices,
          serviceB.idServices,
          serviceCUnavailable.idServices,
        ],
        bucketSeconds: 30,
      });

      expect(result.services.find((s) => s.service_id === serviceCUnavailable.idServices)).toEqual({
        service_id: serviceCUnavailable.idServices,
        external_id: 'search-api',
        name: 'Search API',
        status: ServiceStatus.UNAVAILABLE,
        samples_count: 1,
        avg_cpu_usage: 40,
        total_energy_kwh: 0.0004,
        total_co2e_kg: 0.00025,
      });

      expect(result.series[1]).toEqual({
        timestamp: '2026-11-16T12:00:30.000Z',
        values: {
          [serviceA.idServices]: {
            cpu_usage: 50,
            energy_kwh: 0.0005,
            co2e_kg: 0.0005,
          },
          [serviceB.idServices]: {
            cpu_usage: 25,
            energy_kwh: 0.00025,
            co2e_kg: 0.0001,
          },
          [serviceCUnavailable.idServices]: {
            cpu_usage: null,
            energy_kwh: null,
            co2e_kg: null,
          },
        },
      });

      // Most polluting: serviceA (0.001), Least polluting: serviceB (0.0002) -> (0.001 - 0.0002) / 0.001 * 100 = 80%
      expect(result.summary).toEqual({
        most_polluting_service_id: serviceA.idServices,
        least_polluting_service_id: serviceB.idServices,
        most_polluting_co2e_kg: 0.001,
        least_polluting_co2e_kg: 0.0002,
        co2e_difference_kg: 0.0008,
        efficiency_difference_percent: 80,
      });
    });

    it('excludes an UNAVAILABLE service with zero samples in the period from being treated as least polluting with 0 CO2e', async () => {
      services.find.mockResolvedValue([serviceA, serviceB, serviceCUnavailable]);
      collections.find.mockResolvedValue([
        {
          service_id: serviceA.idServices,
          cpu_usage: '70.000000',
          energy_kwh: 0.001,
          co2e_kg: '0.00080000000',
          timestamp: new Date('2026-11-16T12:00:01.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: '35.000000',
          energy_kwh: 0.0005,
          co2e_kg: '0.00020000000',
          timestamp: new Date('2026-11-16T12:00:02.000Z'),
        },
      ]);

      const result = await analytics.compareServices({
        serviceIds: [
          serviceA.idServices,
          serviceB.idServices,
          serviceCUnavailable.idServices,
        ],
        bucketSeconds: 30,
      });

      expect(result.services[2]).toMatchObject({
        service_id: serviceCUnavailable.idServices,
        status: ServiceStatus.UNAVAILABLE,
        samples_count: 0,
        avg_cpu_usage: null,
        total_energy_kwh: 0,
        total_co2e_kg: 0,
      });
      expect(result.summary).toEqual({
        most_polluting_service_id: serviceA.idServices,
        least_polluting_service_id: serviceB.idServices,
        most_polluting_co2e_kg: 0.0008,
        least_polluting_co2e_kg: 0.0002,
        co2e_difference_kg: 0.0006,
        efficiency_difference_percent: 75,
      });
    });

    it('validates that between 2 and 4 unique serviceIds are provided and all exist', async () => {
      await expect(
        analytics.compareServices({ serviceIds: [serviceA.idServices] } as CompareQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        analytics.compareServices({
          serviceIds: ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'],
        } as CompareQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      services.find.mockResolvedValue([serviceA]);
      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices, 'missing-service'],
          bucketSeconds: 30,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
