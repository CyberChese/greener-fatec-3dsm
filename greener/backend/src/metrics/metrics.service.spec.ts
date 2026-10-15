import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  const service = {
    idServices: '2f33c598-f9bc-46d6-afef-d2f1d6ae12d3',
    external_id: 'billing-api',
    status: ServiceStatus.ACTIVE,
  } as Service;
  let services: {
    find: jest.Mock;
    findOneBy: jest.Mock;
  };
  let collections: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let metricsService: MetricsService;

  beforeEach(() => {
    services = {
      find: jest.fn().mockResolvedValue([service]),
      findOneBy: jest.fn().mockResolvedValue(service),
    };
    collections = {
      create: jest.fn((value: object) => value as MetricCollection),
      save: jest.fn((value: MetricCollection) => Promise.resolve(value)),
      find: jest.fn().mockResolvedValue([]),
    };

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'METRICS_COLLECTION_INTERVAL_SECONDS') return '30';
        if (key === 'METRICS_AGGREGATOR_URL') return 'https://aggregator.example';
        return undefined;
      }),
    };

    metricsService = new MetricsService(
      services as unknown as Repository<Service>,
      collections as unknown as Repository<MetricCollection>,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the configured interval and selects only active services', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          collection_interval_seconds: 27,
          metrics: {
            cpu_percent: 62.67,
            memory_gb: 3.17,
            disk_gb: 19.26,
            network_gb: 0.45,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(metricsService.getCollectionConfig()).resolves.toEqual({
      interval_seconds: 30,
      last_collection_at: null,
    });
    await metricsService.collectCycle();

    expect(services.find).toHaveBeenCalledWith({
      where: { status: ServiceStatus.ACTIVE },
    });
    expect(fetch).toHaveBeenCalledWith(
      new URL('https://aggregator.example/metrics/billing-api'),
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
    expect(collections.save).toHaveBeenCalledWith(
      expect.objectContaining({
        service_id: service.idServices,
        cpu_usage: '62.67',
        memory_usage: '3.17',
        storage_usage: '19.26',
        network_io: '0.45',
        timestamp: expect.any(Date),
      }),
    );
  });

  it('does not persist a payload that violates the aggregator contract', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          collection_interval_seconds: 27,
          metrics: {
            cpu_percent: 101,
            memory_gb: 3.17,
            disk_gb: 19.26,
            network_gb: 0.45,
          },
        }),
        { status: 200 },
      ),
    );
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await metricsService.collectCycle();

    expect(collections.save).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('billing-api'),
      expect.any(String),
    );
    loggerError.mockRestore();
  });

  it('filters a service history by inclusive dates', async () => {
    const from = '2026-10-01T00:00:00.000Z';
    const to = '2026-10-02T00:00:00.000Z';

    await metricsService.findHistory(service.idServices, from, to);

    expect(collections.find).toHaveBeenCalledWith({
      where: {
        service_id: service.idServices,
        timestamp: expect.objectContaining({
          _type: 'between',
        }),
      },
      order: { timestamp: 'ASC' },
    });
  });
});
