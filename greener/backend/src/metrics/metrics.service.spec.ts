import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import { AggregatorClientService } from '../modules/aggregator/aggregator-client.service';
import {
  AggregatorHttpError,
  AggregatorTimeoutError,
  AggregatorUnavailableError,
} from '../modules/aggregator/aggregator.errors';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  const service = {
    idServices: '2f33c598-f9bc-46d6-afef-d2f1d6ae12d3',
    external_id: 'billing-api',
    endpoint: '/metrics/billing-api',
    status: ServiceStatus.ACTIVE,
  } as Service;
  let services: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    update: jest.Mock;
  };
  let collections: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let metricsService: MetricsService;
  let aggregatorClient: {
    fetchMetrics: jest.Mock;
  };

  beforeEach(() => {
    service.status = ServiceStatus.ACTIVE;
    services = {
      find: jest.fn().mockResolvedValue([service]),
      findOneBy: jest.fn().mockResolvedValue(service),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    collections = {
      create: jest.fn((value: object) => value as MetricCollection),
      save: jest.fn((value: MetricCollection) => Promise.resolve(value)),
      find: jest.fn().mockResolvedValue([]),
    };

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'METRICS_COLLECTION_INTERVAL_SECONDS') return '30';
        return undefined;
      }),
    };
    aggregatorClient = {
      fetchMetrics: jest.fn().mockResolvedValue({
        collection_interval_seconds: 27,
        metrics: {
          cpu_percent: 62.67,
          memory_gb: 3.17,
          disk_gb: 19.26,
          network_gb: 0.45,
        },
      }),
    };

    metricsService = new MetricsService(
      services as unknown as Repository<Service>,
      collections as unknown as Repository<MetricCollection>,
      config as unknown as ConfigService,
      aggregatorClient as unknown as AggregatorClientService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the configured interval and selects only active services', async () => {
    await expect(metricsService.getCollectionConfig()).resolves.toEqual({
      interval_seconds: 30,
      last_collection_at: null,
    });
    await metricsService.collectCycle();

    expect(services.find).toHaveBeenCalledWith({
      where: { status: In(Object.values(ServiceStatus)) },
    });
    expect(aggregatorClient.fetchMetrics).toHaveBeenCalledWith(
      '/metrics/billing-api',
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
    aggregatorClient.fetchMetrics.mockResolvedValue({
      collection_interval_seconds: 27,
      metrics: {
        cpu_percent: 101,
        memory_gb: 3.17,
        disk_gb: 19.26,
        network_gb: 0.45,
      },
    });
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await metricsService.collectCycle();

    expect(collections.save).not.toHaveBeenCalled();
    expect(services.update).toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.NO_METRICS },
    );
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('billing-api'),
      expect.any(String),
    );
    loggerError.mockRestore();
  });

  it('skips active services without a discovered metrics endpoint', async () => {
    services.find.mockResolvedValue([{ ...service, endpoint: null }]);

    await metricsService.collectCycle();

    expect(aggregatorClient.fetchMetrics).not.toHaveBeenCalled();
    expect(collections.save).not.toHaveBeenCalled();
    expect(services.update).toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.NO_METRICS },
    );
  });

  it.each([
    ['a timeout', new AggregatorTimeoutError('Request timed out', '/metrics')],
    ['an HTTP 500 failure', new AggregatorHttpError('HTTP 500', '/metrics', 500)],
    ['an unreachable aggregator', new AggregatorUnavailableError('ECONNREFUSED', '/metrics')],
  ])('marks a service unavailable after %s and continues the cycle', async (_, error) => {
    const secondService = {
      ...service,
      idServices: 'efc7aa92-c05f-4971-b711-5ad006752b3b',
      external_id: 'catalog-api',
    } as Service;
    services.find.mockResolvedValue([service, secondService]);
    aggregatorClient.fetchMetrics.mockRejectedValueOnce(error);

    await metricsService.collectCycle();

    expect(services.update).toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.UNAVAILABLE },
    );
    expect(collections.save).toHaveBeenCalledWith(
      expect.objectContaining({ service_id: secondService.idServices }),
    );
  });

  it('marks a service as NO_METRICS after HTTP 404 and continues the cycle', async () => {
    const secondService = {
      ...service,
      idServices: 'efc7aa92-c05f-4971-b711-5ad006752b3b',
      external_id: 'catalog-api',
    } as Service;
    services.find.mockResolvedValue([service, secondService]);
    aggregatorClient.fetchMetrics.mockRejectedValueOnce(
      new AggregatorHttpError('HTTP 404', '/metrics', 404),
    );

    await metricsService.collectCycle();

    expect(services.update).toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.NO_METRICS },
    );
    expect(services.update).not.toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.UNAVAILABLE },
    );
    expect(collections.save).toHaveBeenCalledWith(
      expect.objectContaining({ service_id: secondService.idServices }),
    );
  });

  it('does not keep the previous ACTIVE state after HTTP 404', async () => {
    service.status = ServiceStatus.ACTIVE;
    aggregatorClient.fetchMetrics.mockRejectedValue(
      new AggregatorHttpError('HTTP 404', '/metrics', 404),
    );

    await metricsService.collectCycle();

    expect(service.status).toBe(ServiceStatus.NO_METRICS);
    expect(collections.save).not.toHaveBeenCalled();
  });

  it('persists different states for HTTP 404 and HTTP 500 in the same cycle', async () => {
    const secondService = {
      ...service,
      idServices: 'efc7aa92-c05f-4971-b711-5ad006752b3b',
      external_id: 'catalog-api',
      endpoint: '/metrics/catalog-api',
    } as Service;
    services.find.mockResolvedValue([service, secondService]);
    aggregatorClient.fetchMetrics
      .mockRejectedValueOnce(new AggregatorHttpError('HTTP 404', '/metrics', 404))
      .mockRejectedValueOnce(new AggregatorHttpError('HTTP 500', '/metrics', 500));
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await metricsService.collectCycle();

    expect(services.update).toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.NO_METRICS },
    );
    expect(services.update).toHaveBeenCalledWith(
      { idServices: secondService.idServices },
      { status: ServiceStatus.UNAVAILABLE },
    );
    loggerError.mockRestore();
  });

  it('reports a 404 endpoint as a warning without logging an exception stack', async () => {
    aggregatorClient.fetchMetrics.mockRejectedValue(
      new AggregatorHttpError('HTTP 404', '/metrics', 404),
    );
    const loggerWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await metricsService.collectCycle();

    expect(services.update).toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.NO_METRICS },
    );
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining('returned HTTP 404'),
    );
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('marks a valid response without all required metrics as NO_METRICS', async () => {
    aggregatorClient.fetchMetrics.mockResolvedValue({
      collection_interval_seconds: 27,
      metrics: {
        cpu_percent: 62.67,
        memory_gb: 3.17,
        disk_gb: 19.26,
      },
    });

    await metricsService.collectCycle();

    expect(collections.save).not.toHaveBeenCalled();
    expect(services.update).toHaveBeenCalledWith(
      { idServices: service.idServices },
      { status: ServiceStatus.NO_METRICS },
    );
  });

  it.each([ServiceStatus.UNAVAILABLE, ServiceStatus.NO_METRICS])(
    'reactivates a service in %s after receiving valid metrics',
    async (status) => {
      service.status = status;

      await metricsService.collectCycle();

      expect(collections.save).toHaveBeenCalled();
      expect(services.update).toHaveBeenCalledWith(
        { idServices: service.idServices },
        { status: ServiceStatus.ACTIVE },
      );
    },
  );

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
