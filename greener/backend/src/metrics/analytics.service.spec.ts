import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import {
  ImpactRankingRow,
  ServiceRepository,
} from '../repositories/service.repository';
import { MetricCollectionRepository } from '../repositories/metric-collection.repository';
import { AnalyticsService } from './analytics.service';
import { CompareQueryDto } from './dto/compare-query.dto';
import { RankingQueryDto } from './dto/ranking-query.dto';

describe('AnalyticsService', () => {
  let analytics: AnalyticsService;
  let services: {
    findImpactRanking: jest.Mock<() => Promise<ImpactRankingRow[]>>;
    count: jest.Mock<() => Promise<number>>;
    findByIdentifiers: jest.Mock<() => Promise<Service[]>>;
  };
  let collections: {
    findByServices: jest.Mock<() => Promise<Partial<MetricCollection>[]>>;
  };

  beforeEach(() => {
    services = {
      findImpactRanking: jest.fn<() => Promise<ImpactRankingRow[]>>().mockResolvedValue([
        {
          service_id: 'service-1',
          external_id: 'billing',
          name: 'Billing',
          status: ServiceStatus.ACTIVE,
          metric_value: 1.25,
        },
      ]),
      count: jest.fn<() => Promise<number>>().mockResolvedValue(12),
      findByIdentifiers: jest.fn<() => Promise<Service[]>>().mockResolvedValue([]),
    };
    collections = {
      findByServices: jest.fn<() => Promise<Partial<MetricCollection>[]>>().mockResolvedValue([]),
    };
    analytics = new AnalyticsService(
      services as unknown as ServiceRepository,
      collections as unknown as MetricCollectionRepository,
    );
  });

  describe('getRanking', () => {
    it.each(['energy', 'co2e'] as const)(
      'ranks by %s through the repository with pagination',
      async (metric) => {
        const result = await analytics.getRanking({
          metric,
          order: 'desc',
          page: 2,
          limit: 5,
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-10T00:00:00.000Z',
        } as RankingQueryDto);

        expect(services.findImpactRanking).toHaveBeenCalledWith({
          metric,
          order: 'desc',
          page: 2,
          limit: 5,
          from: new Date('2026-11-01T00:00:00.000Z'),
          to: new Date('2026-11-10T00:00:00.000Z'),
        });
        expect(result.metric).toBe(metric);
        expect(result.order).toBe('desc');
        expect(result.startDate).toBe('2026-11-01T00:00:00.000Z');
        expect(result.endDate).toBe('2026-11-10T00:00:00.000Z');
        expect(result.items[0]).toEqual({
          rank: 6,
          service_id: 'service-1',
          external_id: 'billing',
          name: 'Billing',
          status: ServiceStatus.ACTIVE,
          metric_value: 1.25,
        });
        expect(result.pagination).toEqual({
          page: 2,
          limit: 5,
          total: 12,
          totalPages: 3,
        });
      },
    );

    it('supports ascending order, omitted date bounds, and sequential rank numbering across items', async () => {
      services.findImpactRanking.mockResolvedValue([
        {
          service_id: 'service-a',
          external_id: 'auth',
          name: 'Auth',
          status: ServiceStatus.ACTIVE,
          metric_value: 0.1,
        },
        {
          service_id: 'service-b',
          external_id: 'billing',
          name: 'Billing',
          status: ServiceStatus.UNAVAILABLE,
          metric_value: 0.4,
        },
        {
          service_id: 'service-c',
          external_id: 'search',
          name: 'Search',
          status: ServiceStatus.NO_METRICS,
          metric_value: 0.9,
        },
      ]);
      services.count.mockResolvedValue(3);

      const result = await analytics.getRanking({
        metric: 'energy',
        order: 'asc',
        page: 1,
        limit: 10,
      } as RankingQueryDto);

      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.order).toBe('asc');
      expect(result.items.map((item) => item.rank)).toEqual([1, 2, 3]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      });
    });

    it('returns an empty list and totalPages=0 when no services exist', async () => {
      services.findImpactRanking.mockResolvedValue([]);
      services.count.mockResolvedValue(0);

      const result = await analytics.getRanking({
        metric: 'co2e',
        order: 'desc',
        page: 1,
        limit: 10,
      } as RankingQueryDto);

      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('rejects invalid date values', async () => {
      await expect(
        analytics.getRanking({ startDate: 'invalid' } as RankingQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a start date later than the end date', async () => {
      await expect(
        analytics.getRanking({
          startDate: '2026-11-10T00:00:00.000Z',
          endDate: '2026-11-01T00:00:00.000Z',
        } as RankingQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
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

    const serviceD = {
      idServices: '44444444-4444-4444-8444-444444444444',
      external_id: 'catalog-api',
      nameServices: 'Catalog API',
      status: ServiceStatus.ACTIVE,
    } as Service;

    it('returns temporally aligned paired series (CPU, kWh, CO2e) and efficiency summary for active services', async () => {
      services.findByIdentifiers.mockResolvedValue([serviceA, serviceB]);
      collections.findByServices.mockResolvedValue([
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

    it('averages CPU and sums energy/CO2e for multiple samples in the same bucket, using co2e_g fallback when co2e_kg is null', async () => {
      services.findByIdentifiers.mockResolvedValue([serviceB, serviceA]);
      collections.findByServices.mockResolvedValue([
        {
          service_id: serviceA.idServices,
          cpu_usage: '40.000000',
          energy_kwh: 0.0004,
          co2e_kg: null,
          co2e_g: '0.20000000', // 0.0002 kg
          timestamp: new Date('2026-11-16T12:00:05.000Z'),
        },
        {
          service_id: serviceA.idServices,
          cpu_usage: '80.000000',
          energy_kwh: 0.0006,
          co2e_kg: null,
          co2e_g: '0.30000000', // 0.0003 kg
          timestamp: new Date('2026-11-16T12:00:25.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: null,
          energy_kwh: null,
          co2e_kg: null,
          co2e_g: null,
          timestamp: new Date('2026-11-16T12:00:10.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: 'not-a-number',
          energy_kwh: Number.NaN,
          co2e_kg: '',
          co2e_g: '',
          timestamp: new Date('invalid-date'),
        },
      ]);

      // Resolve by mixed external_id and UUID, preserving request order and default bucketSeconds (30)
      const result = await analytics.compareServices({
        serviceIds: [serviceA.external_id, serviceB.idServices],
      } as CompareQueryDto);

      expect(result.bucketSeconds).toBe(30);
      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.services.map((s) => s.service_id)).toEqual([
        serviceA.idServices,
        serviceB.idServices,
      ]);
      expect(result.series).toEqual([
        {
          timestamp: '2026-11-16T12:00:00.000Z',
          values: {
            [serviceA.idServices]: {
              cpu_usage: 60,
              energy_kwh: 0.001,
              co2e_kg: 0.0005,
            },
            [serviceB.idServices]: {
              cpu_usage: null,
              energy_kwh: null,
              co2e_kg: null,
            },
          },
        },
      ]);
      expect(result.summary).toEqual({
        most_polluting_service_id: serviceA.idServices,
        least_polluting_service_id: serviceB.idServices,
        most_polluting_co2e_kg: 0.0005,
        least_polluting_co2e_kg: 0,
        co2e_difference_kg: 0.0005,
        efficiency_difference_percent: 100,
      });
    });

    it('compares active services with a temporarily unavailable (UNAVAILABLE) service, filling missing buckets with null', async () => {
      services.findByIdentifiers.mockResolvedValue([
        serviceA,
        serviceB,
        serviceCUnavailable,
      ]);
      collections.findByServices.mockResolvedValue([
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

      expect(
        result.services.find(
          (s) => s.service_id === serviceCUnavailable.idServices,
        ),
      ).toEqual({
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
      services.findByIdentifiers.mockResolvedValue([
        serviceA,
        serviceB,
        serviceCUnavailable,
      ]);
      collections.findByServices.mockResolvedValue([
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

    it('supports comparing up to 4 services and handles tie-breaking by energy and name', async () => {
      services.findByIdentifiers.mockResolvedValue([
        serviceA,
        serviceB,
        serviceCUnavailable,
        serviceD,
      ]);
      collections.findByServices.mockResolvedValue([
        {
          service_id: serviceA.idServices,
          cpu_usage: '50',
          energy_kwh: 0.002,
          co2e_kg: '0.0005',
          timestamp: new Date('2026-11-16T12:00:00.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: '30',
          energy_kwh: 0.001,
          co2e_kg: '0.0005',
          timestamp: new Date('2026-11-16T12:00:00.000Z'),
        },
        {
          service_id: serviceCUnavailable.idServices,
          cpu_usage: '20',
          energy_kwh: 0.001,
          co2e_kg: '0.0005',
          timestamp: new Date('2026-11-16T12:00:00.000Z'),
        },
        {
          service_id: serviceD.idServices,
          cpu_usage: '10',
          energy_kwh: 0.0005,
          co2e_kg: '0.0001',
          timestamp: new Date('2026-11-16T12:00:00.000Z'),
        },
      ]);

      const result = await analytics.compareServices({
        serviceIds: [
          serviceA.external_id,
          serviceB.external_id,
          serviceCUnavailable.external_id,
          serviceD.external_id,
        ],
        bucketSeconds: 60,
      });

      expect(result.services).toHaveLength(4);
      expect(result.summary).toEqual({
        most_polluting_service_id: serviceA.idServices,
        least_polluting_service_id: serviceD.idServices,
        most_polluting_co2e_kg: 0.0005,
        least_polluting_co2e_kg: 0.0001,
        co2e_difference_kg: 0.0004,
        efficiency_difference_percent: 80,
      });
    });

    it('returns null statistical summary when no compared service has samples', async () => {
      services.findByIdentifiers.mockResolvedValue([serviceA, serviceB]);
      collections.findByServices.mockResolvedValue([]);

      const result = await analytics.compareServices({
        serviceIds: [serviceA.idServices, serviceB.idServices],
        bucketSeconds: 30,
      });

      expect(result.series).toEqual([]);
      expect(result.summary).toEqual({
        most_polluting_service_id: null,
        least_polluting_service_id: null,
        most_polluting_co2e_kg: null,
        least_polluting_co2e_kg: null,
        co2e_difference_kg: null,
        efficiency_difference_percent: null,
      });
    });

    it('returns efficiency_difference_percent=0 when measured services emit 0 kgCO2e', async () => {
      services.findByIdentifiers.mockResolvedValue([serviceA, serviceB]);
      collections.findByServices.mockResolvedValue([
        {
          service_id: serviceA.idServices,
          cpu_usage: '10',
          energy_kwh: 0,
          co2e_kg: '0',
          timestamp: new Date('2026-11-16T12:00:00.000Z'),
        },
        {
          service_id: serviceB.idServices,
          cpu_usage: '20',
          energy_kwh: 0,
          co2e_kg: '0',
          timestamp: new Date('2026-11-16T12:00:00.000Z'),
        },
      ]);

      const result = await analytics.compareServices({
        serviceIds: [serviceA.idServices, serviceB.idServices],
        bucketSeconds: 30,
      });

      expect(result.summary.efficiency_difference_percent).toBe(0);
      expect(result.summary.co2e_difference_kg).toBe(0);
    });

    it('validates serviceIds count, uniqueness, bucketSeconds, date range, and existence', async () => {
      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices],
        } as CompareQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        analytics.compareServices({
          serviceIds: ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'],
        } as CompareQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices, serviceA.idServices],
        } as CompareQueryDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices, serviceB.idServices],
          bucketSeconds: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices, serviceB.idServices],
          bucketSeconds: 1.5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices, serviceB.idServices],
          startDate: '2026-11-17T00:00:00.000Z',
          endDate: '2026-11-16T00:00:00.000Z',
          bucketSeconds: 30,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      services.findByIdentifiers.mockResolvedValue([serviceA]);
      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices, 'missing-service'],
          bucketSeconds: 30,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      // Same service referenced once by UUID and once by external_id
      services.findByIdentifiers.mockResolvedValue([serviceA]);
      await expect(
        analytics.compareServices({
          serviceIds: [serviceA.idServices, serviceA.external_id],
          bucketSeconds: 30,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
