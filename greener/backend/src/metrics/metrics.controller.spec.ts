import { jest } from '@jest/globals';
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Service, ServiceStatus } from '../entities/service.entity';
import { MetricCollectionRepository } from '../repositories/metric-collection.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AnalyticsService } from './analytics.service';
import {
  MetricsController,
  ServiceMetricsController,
} from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController & ServiceMetricsController', () => {
  let app: INestApplication;

  const summary = {
    total_energy_kwh: 12.5,
    total_co2e_kg: 3.2,
    services_count: {
      active: 4,
      unavailable: 1,
      no_metrics: 2,
    },
  };
  const collectionConfig = {
    interval_seconds: 30,
    last_collection_at: '2026-11-16T12:00:00.000Z',
  };
  const validServiceId = '11111111-1111-4111-8111-111111111111';
  const missingServiceId = '99999999-9999-4999-8999-999999999999';

  const getRanking = jest.fn((query: object) => Promise.resolve(query));
  const compareServices = jest.fn((query: object) => Promise.resolve(query));
  const findHistory = jest.fn(async (serviceId: string) => {
    if (serviceId === missingServiceId) {
      throw new NotFoundException('Service not found.');
    }
    return [
      {
        idCollections: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        service_id: serviceId,
        cpu_usage: '45.000000',
        energy_kwh: 0.00045,
        co2e_kg: '0.00022500000',
        timestamp: '2026-11-16T12:00:00.000Z',
      },
    ];
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MetricsController, ServiceMetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getSummary: jest.fn().mockResolvedValue(summary),
            getCollectionConfig: jest.fn().mockResolvedValue(collectionConfig),
            findHistory,
          },
        },
        {
          provide: AnalyticsService,
          useValue: { getRanking, compareServices },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the summary with HTTP 200 without a token', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/summary')
      .expect(200)
      .expect(summary);
  });

  it('returns the collection config with HTTP 200', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/collection-config')
      .expect(200)
      .expect(collectionConfig);
  });

  it('serves a paginated ranking endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/ranking?metric=co2e&order=desc&page=2&limit=5')
      .expect(200)
      .expect({ metric: 'co2e', order: 'desc', page: 2, limit: 5 });
  });

  it('rejects invalid dates and unsupported ranking metrics', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/ranking?startDate=not-a-date')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/metrics/ranking?metric=unknown')
      .expect(400);
  });

  it('serves the multi-service comparison endpoint for 2 to 4 serviceIds', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/metrics/compare?serviceIds=billing-api,auth-api,search-api&bucketSeconds=60',
      )
      .expect(200)
      .expect({
        serviceIds: ['billing-api', 'auth-api', 'search-api'],
        bucketSeconds: 60,
      });
  });

  it('rejects compare requests with fewer than 2, more than 4, or duplicate serviceIds', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/compare?serviceIds=only-one')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/metrics/compare?serviceIds=s1,s2,s3,s4,s5')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/metrics/compare?serviceIds=s1,s1')
      .expect(400);
  });

  it('returns service history for a valid UUID and rejects invalid or unknown IDs', async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/services/${validServiceId}/history?from=2026-11-16T00:00:00.000Z&to=2026-11-16T23:59:59.000Z`,
      )
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(findHistory).toHaveBeenCalledWith(
      validServiceId,
      '2026-11-16T00:00:00.000Z',
      '2026-11-16T23:59:59.000Z',
    );

    await request(app.getHttpServer())
      .get('/api/services/not-a-uuid/history')
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/services/${missingServiceId}/history`)
      .expect(404);
  });
});

describe('MetricsController + AnalyticsService (HTTP integration)', () => {
  let app: INestApplication;

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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        AnalyticsService,
        {
          provide: MetricsService,
          useValue: {
            getSummary: jest.fn(),
            getCollectionConfig: jest.fn(),
          },
        },
        {
          provide: ServiceRepository,
          useValue: {
            findImpactRanking: jest.fn().mockResolvedValue([
              {
                service_id: serviceA.idServices,
                external_id: serviceA.external_id,
                name: serviceA.nameServices,
                status: ServiceStatus.ACTIVE,
                metric_value: 0.0009,
              },
              {
                service_id: serviceB.idServices,
                external_id: serviceB.external_id,
                name: serviceB.nameServices,
                status: ServiceStatus.ACTIVE,
                metric_value: 0.0003,
              },
            ]),
            count: jest.fn().mockResolvedValue(2),
            findByIdentifiers: jest.fn().mockResolvedValue([serviceA, serviceB]),
          },
        },
        {
          provide: MetricCollectionRepository,
          useValue: {
            findByServices: jest.fn().mockResolvedValue([
              {
                service_id: serviceA.idServices,
                cpu_usage: '80.000000',
                energy_kwh: 0.0008,
                co2e_kg: '0.00040000000',
                timestamp: new Date('2026-11-16T12:00:05.000Z'),
              },
              {
                service_id: serviceB.idServices,
                cpu_usage: '20.000000',
                energy_kwh: 0.0002,
                co2e_kg: '0.00010000000',
                timestamp: new Date('2026-11-16T12:00:10.000Z'),
              },
            ]),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates full ranking JSON payload through controller, DTO pipe, and AnalyticsService', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/metrics/ranking?metric=co2e&order=desc&page=1&limit=10')
      .expect(200);

    expect(res.body).toEqual({
      metric: 'co2e',
      order: 'desc',
      startDate: null,
      endDate: null,
      items: [
        {
          rank: 1,
          service_id: serviceA.idServices,
          external_id: 'billing-api',
          name: 'Billing API',
          status: 'ACTIVE',
          metric_value: 0.0009,
        },
        {
          rank: 2,
          service_id: serviceB.idServices,
          external_id: 'auth-api',
          name: 'Auth API',
          status: 'ACTIVE',
          metric_value: 0.0003,
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });
  });

  it('validates full comparison JSON payload through controller, DTO pipe, and AnalyticsService', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/metrics/compare?serviceIds=billing-api,auth-api&bucketSeconds=30')
      .expect(200);

    expect(res.body).toEqual({
      startDate: null,
      endDate: null,
      bucketSeconds: 30,
      services: [
        {
          service_id: serviceA.idServices,
          external_id: 'billing-api',
          name: 'Billing API',
          status: 'ACTIVE',
          samples_count: 1,
          avg_cpu_usage: 80,
          total_energy_kwh: 0.0008,
          total_co2e_kg: 0.0004,
        },
        {
          service_id: serviceB.idServices,
          external_id: 'auth-api',
          name: 'Auth API',
          status: 'ACTIVE',
          samples_count: 1,
          avg_cpu_usage: 20,
          total_energy_kwh: 0.0002,
          total_co2e_kg: 0.0001,
        },
      ],
      series: [
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
      ],
      summary: {
        most_polluting_service_id: serviceA.idServices,
        least_polluting_service_id: serviceB.idServices,
        most_polluting_co2e_kg: 0.0004,
        least_polluting_co2e_kg: 0.0001,
        co2e_difference_kg: 0.0003,
        efficiency_difference_percent: 75,
      },
    });
  });
});
