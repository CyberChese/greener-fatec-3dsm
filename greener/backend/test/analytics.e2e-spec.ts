import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MetricCollection } from '../src/entities/metric-collection.entity';
import { Service, ServiceStatus } from '../src/entities/service.entity';
import { AggregatorClientService } from '../src/modules/aggregator/aggregator-client.service';
import { CarbonIntensityClientService } from '../src/modules/carbon-intensity/carbon-intensity-client.service';

function loadEnvFileIntoProcess(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

function loadE2eEnvironment(): void {
  loadEnvFileIntoProcess(join(__dirname, '../../../.env'));
  loadEnvFileIntoProcess(join(__dirname, '../.env'));

  // Outside Docker containers, "greener-postgres" does not resolve on the host machine.
  if (
    process.env.POSTGRES_HOST === 'greener-postgres' &&
    !existsSync('/.dockerenv') &&
    process.env.E2E_KEEP_POSTGRES_HOST !== 'true'
  ) {
    process.env.POSTGRES_HOST = 'localhost';
  }

  process.env.NODE_ENV = 'test';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    process.env.JWT_SECRET = 'greener-e2e-test-jwt-secret-with-at-least-32-bytes';
  }
  process.env.SERVICE_DISCOVERY_INTERVAL_SECONDS = '3600';
  process.env.METRICS_COLLECTION_INTERVAL_SECONDS = '3600';
}

describe('Analytics & Metrics REST API (E2E + PostgreSQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const runId = `e2e-${Date.now()}`;
  const seededServiceIds: string[] = [];

  let billingService: Service;
  let checkoutService: Service;
  let authService: Service;
  let unavailableService: Service;

  // Dedicated historical window isolated from live collections in local databases.
  const windowStart = '2025-05-10T10:00:00.000Z';
  const windowEnd = '2025-05-10T10:02:00.000Z';

  beforeAll(async () => {
    loadE2eEnvironment();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AggregatorClientService)
      .useValue({
        fetchDiscoveredServices: jest
          .fn<() => Promise<{ services: never[]; isComplete: boolean }>>()
          .mockResolvedValue({ services: [], isComplete: false }),
        fetchServiceMetrics: jest
          .fn<() => Promise<never>>()
          .mockRejectedValue(new Error('Aggregator disabled in E2E tests.')),
      })
      .overrideProvider(CarbonIntensityClientService)
      .useValue({
        getIntensity: jest
          .fn<() => Promise<{ intensityGPerKwh: number; fallback: boolean }>>()
          .mockResolvedValue({ intensityGPerKwh: 100, fallback: true }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);

    const serviceRepo = dataSource.getRepository(Service);
    const collectionRepo = dataSource.getRepository(MetricCollection);

    // Billing: higher CO2e (0.00090 kg), moderate energy (0.0020 kWh)
    // Checkout: higher energy (0.0060 kWh), moderate CO2e (0.00045 kg)
    // Auth: lower energy (0.0010 kWh), lowest CO2e (0.00018 kg)
    // Unavailable: 0 samples inside the window (tests null buckets & exclusion from least_polluting)
    [billingService, checkoutService, authService, unavailableService] =
      await serviceRepo.save([
        serviceRepo.create({
          external_id: `${runId}-billing`,
          nameServices: `E2E Billing ${runId}`,
          endpoint: `/metrics/${runId}-billing`,
          region_code: 'us-east',
          status: ServiceStatus.ACTIVE,
          country: 'United States',
          region: 'Virginia',
          city: 'Ashburn',
          latitude: '39.043800',
          longitude: '-77.487400',
          last_observed_at: new Date('2025-05-10T10:01:00.000Z'),
        }),
        serviceRepo.create({
          external_id: `${runId}-checkout`,
          nameServices: `E2E Checkout ${runId}`,
          endpoint: `/metrics/${runId}-checkout`,
          region_code: 'br-sudeste',
          status: ServiceStatus.ACTIVE,
          country: 'Brazil',
          region: 'Southeast',
          city: 'Sao Paulo',
          latitude: '-23.550500',
          longitude: '-46.633300',
          last_observed_at: new Date('2025-05-10T10:01:00.000Z'),
        }),
        serviceRepo.create({
          external_id: `${runId}-auth`,
          nameServices: `E2E Auth ${runId}`,
          endpoint: `/metrics/${runId}-auth`,
          region_code: 'eu-north',
          status: ServiceStatus.ACTIVE,
          country: 'Sweden',
          region: 'Stockholm',
          city: 'Stockholm',
          latitude: '59.329300',
          longitude: '18.068600',
          last_observed_at: new Date('2025-05-10T10:01:00.000Z'),
        }),
        serviceRepo.create({
          external_id: `${runId}-unavailable`,
          nameServices: `E2E Unavailable ${runId}`,
          endpoint: `/metrics/${runId}-unavailable`,
          region_code: 'br-sul',
          status: ServiceStatus.UNAVAILABLE,
          country: 'Brazil',
          region: 'South',
          city: 'Curitiba',
          latitude: '-25.428400',
          longitude: '-49.273300',
          last_observed_at: new Date('2025-05-10T09:00:00.000Z'),
        }),
      ]);

    seededServiceIds.push(
      billingService.idServices,
      checkoutService.idServices,
      authService.idServices,
      unavailableService.idServices,
    );

    await collectionRepo.save([
      // Bucket 1: 2025-05-10T10:00:00.000Z
      collectionRepo.create({
        service_id: billingService.idServices,
        cpu_usage: '80.000000',
        memory_usage: '4.000000',
        storage_usage: '20.000000',
        network_io: '1.200000',
        timestamp: new Date('2025-05-10T10:00:05.000Z'),
        energy_kwh: 0.001,
        carbon_intensity_gco2e_per_kwh: '450.00000000',
        co2e_g: '0.45000000',
        co2e_kg: '0.00045000000',
        carbon_intensity_fallback: false,
      }),
      collectionRepo.create({
        service_id: checkoutService.idServices,
        cpu_usage: '60.000000',
        memory_usage: '3.000000',
        storage_usage: '15.000000',
        network_io: '0.900000',
        timestamp: new Date('2025-05-10T10:00:08.000Z'),
        energy_kwh: 0.003,
        carbon_intensity_gco2e_per_kwh: '75.00000000',
        co2e_g: '0.22500000',
        co2e_kg: '0.00022500000',
        carbon_intensity_fallback: false,
      }),
      collectionRepo.create({
        service_id: authService.idServices,
        cpu_usage: '20.000000',
        memory_usage: '1.500000',
        storage_usage: '10.000000',
        network_io: '0.400000',
        timestamp: new Date('2025-05-10T10:00:12.000Z'),
        energy_kwh: 0.0005,
        carbon_intensity_gco2e_per_kwh: '180.00000000',
        co2e_g: '0.09000000',
        co2e_kg: '0.00009000000',
        carbon_intensity_fallback: false,
      }),
      // Bucket 2: 2025-05-10T10:00:30.000Z
      collectionRepo.create({
        service_id: billingService.idServices,
        cpu_usage: '60.000000',
        memory_usage: '4.000000',
        storage_usage: '20.000000',
        network_io: '1.000000',
        timestamp: new Date('2025-05-10T10:00:35.000Z'),
        energy_kwh: 0.001,
        carbon_intensity_gco2e_per_kwh: '450.00000000',
        co2e_g: '0.45000000',
        co2e_kg: '0.00045000000',
        carbon_intensity_fallback: false,
      }),
      collectionRepo.create({
        service_id: checkoutService.idServices,
        cpu_usage: '50.000000',
        memory_usage: '3.000000',
        storage_usage: '15.000000',
        network_io: '0.800000',
        timestamp: new Date('2025-05-10T10:00:40.000Z'),
        energy_kwh: 0.003,
        carbon_intensity_gco2e_per_kwh: '75.00000000',
        co2e_g: '0.22500000',
        co2e_kg: '0.00022500000',
        carbon_intensity_fallback: false,
      }),
      collectionRepo.create({
        service_id: authService.idServices,
        cpu_usage: '30.000000',
        memory_usage: '1.500000',
        storage_usage: '10.000000',
        network_io: '0.300000',
        timestamp: new Date('2025-05-10T10:00:45.000Z'),
        energy_kwh: 0.0005,
        carbon_intensity_gco2e_per_kwh: '180.00000000',
        co2e_g: '0.09000000',
        co2e_kg: '0.00009000000',
        carbon_intensity_fallback: false,
      }),
      // Out-of-window record for unavailableService (must NOT leak into [windowStart, windowEnd])
      collectionRepo.create({
        service_id: unavailableService.idServices,
        cpu_usage: '95.000000',
        memory_usage: '8.000000',
        storage_usage: '50.000000',
        network_io: '5.000000',
        timestamp: new Date('2025-05-09T08:00:00.000Z'),
        energy_kwh: 0.5,
        carbon_intensity_gco2e_per_kwh: '500.00000000',
        co2e_g: '250.00000000',
        co2e_kg: '0.25000000000',
        carbon_intensity_fallback: false,
      }),
    ]);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized && seededServiceIds.length > 0) {
      await dataSource
        .getRepository(MetricCollection)
        .delete({ service_id: In(seededServiceIds) });
      await dataSource
        .getRepository(Service)
        .delete({ idServices: In(seededServiceIds) });
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/metrics/ranking', () => {
    it('returns HTTP 200 OK with valid JSON contract and ranks seeded services by CO2e descending', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/ranking')
        .query({
          metric: 'co2e',
          order: 'desc',
          startDate: windowStart,
          endDate: windowEnd,
          page: 1,
          limit: 100,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        metric: 'co2e',
        order: 'desc',
        startDate: windowStart,
        endDate: windowEnd,
      });
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 100,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);

      const seededItems = (
        res.body.items as Array<{
          rank: number;
          service_id: string;
          external_id: string;
          name: string;
          status: string;
          metric_value: number;
        }>
      ).filter((item) => seededServiceIds.includes(item.service_id));

      expect(seededItems).toHaveLength(4);
      expect(seededItems.map((i) => i.service_id)).toEqual([
        billingService.idServices,
        checkoutService.idServices,
        authService.idServices,
        unavailableService.idServices,
      ]);
      expect(seededItems[0].metric_value).toBeCloseTo(0.0009, 8);
      expect(seededItems[1].metric_value).toBeCloseTo(0.00045, 8);
      expect(seededItems[2].metric_value).toBeCloseTo(0.00018, 8);
      expect(seededItems[3].metric_value).toBe(0);
    });

    it('reorders services when switching metric to energy (desc & asc) and supports pagination', async () => {
      const energyDesc = await request(app.getHttpServer())
        .get('/api/metrics/ranking')
        .query({
          metric: 'energy',
          order: 'desc',
          startDate: windowStart,
          endDate: windowEnd,
          page: 1,
          limit: 100,
        })
        .expect(200);

      const descSeeded = (
        energyDesc.body.items as Array<{
          service_id: string;
          metric_value: number;
        }>
      ).filter((item) => seededServiceIds.includes(item.service_id));

      // By energy: checkout (0.006) > billing (0.002) > auth (0.001) > unavailable (0)
      expect(descSeeded.map((i) => i.service_id)).toEqual([
        checkoutService.idServices,
        billingService.idServices,
        authService.idServices,
        unavailableService.idServices,
      ]);
      expect(descSeeded[0].metric_value).toBeCloseTo(0.006, 8);
      expect(descSeeded[1].metric_value).toBeCloseTo(0.002, 8);
      expect(descSeeded[2].metric_value).toBeCloseTo(0.001, 8);

      const paginated = await request(app.getHttpServer())
        .get('/api/metrics/ranking')
        .query({
          metric: 'energy',
          order: 'asc',
          startDate: windowStart,
          endDate: windowEnd,
          page: 2,
          limit: 2,
        })
        .expect(200);

      expect(paginated.body.order).toBe('asc');
      expect(paginated.body.pagination.page).toBe(2);
      expect(paginated.body.pagination.limit).toBe(2);
      expect(paginated.body.items.length).toBeLessThanOrEqual(2);
      if (paginated.body.items.length > 0) {
        expect(paginated.body.items[0].rank).toBe(3);
      }
    });

    it('returns HTTP 400 for invalid metric, order, or inverted date range', async () => {
      await request(app.getHttpServer())
        .get('/api/metrics/ranking?metric=invalid')
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/metrics/ranking')
        .query({ startDate: windowEnd, endDate: windowStart })
        .expect(400);
    });
  });

  describe('GET /api/metrics/compare', () => {
    it('returns HTTP 200 OK with aligned time series, service summaries, and efficiency stats from PostgreSQL', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/compare')
        .query({
          serviceIds: [
            billingService.idServices,
            checkoutService.external_id,
            authService.idServices,
            unavailableService.external_id,
          ].join(','),
          startDate: windowStart,
          endDate: windowEnd,
          bucketSeconds: 30,
        })
        .expect(200);

      expect(res.body).toEqual({
        startDate: windowStart,
        endDate: windowEnd,
        bucketSeconds: 30,
        services: [
          {
            service_id: billingService.idServices,
            external_id: billingService.external_id,
            name: billingService.nameServices,
            status: ServiceStatus.ACTIVE,
            samples_count: 2,
            avg_cpu_usage: 70,
            total_energy_kwh: 0.002,
            total_co2e_kg: 0.0009,
          },
          {
            service_id: checkoutService.idServices,
            external_id: checkoutService.external_id,
            name: checkoutService.nameServices,
            status: ServiceStatus.ACTIVE,
            samples_count: 2,
            avg_cpu_usage: 55,
            total_energy_kwh: 0.006,
            total_co2e_kg: 0.00045,
          },
          {
            service_id: authService.idServices,
            external_id: authService.external_id,
            name: authService.nameServices,
            status: ServiceStatus.ACTIVE,
            samples_count: 2,
            avg_cpu_usage: 25,
            total_energy_kwh: 0.001,
            total_co2e_kg: 0.00018,
          },
          {
            service_id: unavailableService.idServices,
            external_id: unavailableService.external_id,
            name: unavailableService.nameServices,
            status: ServiceStatus.UNAVAILABLE,
            samples_count: 0,
            avg_cpu_usage: null,
            total_energy_kwh: 0,
            total_co2e_kg: 0,
          },
        ],
        series: [
          {
            timestamp: '2025-05-10T10:00:00.000Z',
            values: {
              [billingService.idServices]: {
                cpu_usage: 80,
                energy_kwh: 0.001,
                co2e_kg: 0.00045,
              },
              [checkoutService.idServices]: {
                cpu_usage: 60,
                energy_kwh: 0.003,
                co2e_kg: 0.000225,
              },
              [authService.idServices]: {
                cpu_usage: 20,
                energy_kwh: 0.0005,
                co2e_kg: 0.00009,
              },
              [unavailableService.idServices]: {
                cpu_usage: null,
                energy_kwh: null,
                co2e_kg: null,
              },
            },
          },
          {
            timestamp: '2025-05-10T10:00:30.000Z',
            values: {
              [billingService.idServices]: {
                cpu_usage: 60,
                energy_kwh: 0.001,
                co2e_kg: 0.00045,
              },
              [checkoutService.idServices]: {
                cpu_usage: 50,
                energy_kwh: 0.003,
                co2e_kg: 0.000225,
              },
              [authService.idServices]: {
                cpu_usage: 30,
                energy_kwh: 0.0005,
                co2e_kg: 0.00009,
              },
              [unavailableService.idServices]: {
                cpu_usage: null,
                energy_kwh: null,
                co2e_kg: null,
              },
            },
          },
        ],
        // Most polluting: billing (0.0009), Least polluting: auth (0.00018) -> (0.0009 - 0.00018) / 0.0009 * 100 = 80%
        summary: {
          most_polluting_service_id: billingService.idServices,
          least_polluting_service_id: authService.idServices,
          most_polluting_co2e_kg: 0.0009,
          least_polluting_co2e_kg: 0.00018,
          co2e_difference_kg: 0.00072,
          efficiency_difference_percent: 80,
        },
      });
    });

    it('aggregates multiple collections into a single 60-second bucket when bucketSeconds=60', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/compare')
        .query({
          serviceIds: `${billingService.external_id},${authService.external_id}`,
          startDate: windowStart,
          endDate: windowEnd,
          bucketSeconds: 60,
        })
        .expect(200);

      expect(res.body.bucketSeconds).toBe(60);
      expect(res.body.series).toEqual([
        {
          timestamp: '2025-05-10T10:00:00.000Z',
          values: {
            [billingService.idServices]: {
              cpu_usage: 70,
              energy_kwh: 0.002,
              co2e_kg: 0.0009,
            },
            [authService.idServices]: {
              cpu_usage: 25,
              energy_kwh: 0.001,
              co2e_kg: 0.00018,
            },
          },
        },
      ]);
    });

    it('returns HTTP 400 for invalid serviceIds and HTTP 404 when a requested service does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/metrics/compare')
        .query({ serviceIds: billingService.idServices })
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/metrics/compare')
        .query({
          serviceIds: `${billingService.idServices},${billingService.external_id}`,
        })
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/metrics/compare')
        .query({
          serviceIds: `${billingService.idServices},non-existent-service-${runId}`,
        })
        .expect(404);
    });
  });

  describe('Complementary REST + PostgreSQL endpoints', () => {
    it('returns HTTP 200 OK on /api/metrics/summary, /api/services, and /api/services/:id/history', async () => {
      const summaryRes = await request(app.getHttpServer())
        .get('/api/metrics/summary')
        .expect(200);

      expect(typeof summaryRes.body.total_energy_kwh).toBe('number');
      expect(typeof summaryRes.body.total_co2e_kg).toBe('number');
      expect(summaryRes.body.services_count.active).toBeGreaterThanOrEqual(3);
      expect(summaryRes.body.services_count.unavailable).toBeGreaterThanOrEqual(1);

      const servicesRes = await request(app.getHttpServer())
        .get('/api/services')
        .expect(200);

      expect(Array.isArray(servicesRes.body)).toBe(true);
      const returnedIds = (servicesRes.body as Array<{ idServices: string }>).map(
        (s) => s.idServices,
      );
      expect(returnedIds).toEqual(expect.arrayContaining(seededServiceIds));

      const historyRes = await request(app.getHttpServer())
        .get(`/api/services/${billingService.idServices}/history`)
        .query({ from: windowStart, to: windowEnd })
        .expect(200);

      expect(historyRes.body).toHaveLength(2);
      expect(historyRes.body[0].service_id).toBe(billingService.idServices);
    });
  });
});
