import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import { MetricCollectionRepository } from '../repositories/metric-collection.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AggregatorClientService } from '../modules/aggregator/aggregator-client.service';
import { CarbonIntensityClientService } from '../modules/carbon-intensity/carbon-intensity-client.service';
import { EnergyEngineService } from '../engine/energy-engine.service';
import { CarbonEngineService } from '../engine/carbon-engine.service';
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
    region_code: 'br-sudeste',
    status: ServiceStatus.ACTIVE,
  } as Service;
  let services: {
    findAll: jest.Mock;
    findById: jest.Mock;
    updateStatus: jest.Mock;
    countByStatus: jest.Mock;
  };
  let collections: {
    createAndSave: jest.Mock;
    findLatestTimestamp: jest.Mock;
    sumImpact: jest.Mock;
    findByService: jest.Mock;
  };
  let metricsService: MetricsService;
  let aggregatorClient: {
    fetchMetrics: jest.Mock;
  };
  let carbonIntensityClient: {
    getIntensity: jest.Mock;
  };

  beforeEach(() => {
    service.status = ServiceStatus.ACTIVE;
    services = {
      findAll: jest.fn().mockResolvedValue([service]),
      findById: jest.fn().mockResolvedValue(service),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      countByStatus: jest.fn(),
    };
    collections = {
      createAndSave: jest.fn((value: MetricCollection) => Promise.resolve(value)),
      findLatestTimestamp: jest.fn().mockResolvedValue(null),
      sumImpact: jest.fn(),
      findByService: jest.fn().mockResolvedValue([]),
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
    carbonIntensityClient = {
      getIntensity: jest.fn().mockResolvedValue({
        intensityGco2ePerKwh: 85,
        usedFallback: false,
      }),
    };

    metricsService = new MetricsService(
      services as unknown as ServiceRepository,
      collections as unknown as MetricCollectionRepository,
      new EnergyEngineService(),
      new CarbonEngineService(collections as unknown as MetricCollectionRepository),
      config as unknown as ConfigService,
      aggregatorClient as unknown as AggregatorClientService,
      carbonIntensityClient as unknown as CarbonIntensityClientService,
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

    expect(services.findAll).toHaveBeenCalled();
    expect(aggregatorClient.fetchMetrics).toHaveBeenCalledWith(
      '/metrics/billing-api',
    );
    expect(collections.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        service_id: service.idServices,
        cpu_usage: '62.67',
        memory_usage: '3.17',
        storage_usage: '19.26',
        network_io: '0.45',
        energy_kwh: expect.any(Number),
        carbon_intensity_gco2e_per_kwh: '85.00000000',
        co2e_g: expect.any(String),
        co2e_kg: expect.any(String),
        carbon_intensity_fallback: false,
        timestamp: expect.any(Date),
      }),
    );
    expect(carbonIntensityClient.getIntensity).toHaveBeenCalledWith(
      'br-sudeste',
    );
    const savedCollection = collections.createAndSave.mock.calls[0][0];
    expect(Number(savedCollection.co2e_g)).toBeCloseTo(
      savedCollection.energy_kwh * 85,
      8,
    );
    expect(Number(savedCollection.co2e_kg)).toBeCloseTo(
      Number(savedCollection.co2e_g) / 1000,
      11,
    );
  });

  it('aggregates energy, CO2e and service statuses', async () => {
    collections.sumImpact.mockResolvedValue({ energyKwh: 12.5, co2eKg: 3.2 });
    services.countByStatus.mockResolvedValue({
      [ServiceStatus.ACTIVE]: 4,
      [ServiceStatus.UNAVAILABLE]: 1,
      [ServiceStatus.NO_METRICS]: 2,
    });

    await expect(metricsService.getSummary()).resolves.toEqual({
      total_energy_kwh: 12.5,
      total_co2e_kg: 3.2,
      services_count: {
        active: 4,
        unavailable: 1,
        no_metrics: 2,
      },
    });
  });

  it('returns zeros when there are no collections or services', async () => {
    collections.sumImpact.mockResolvedValue({ energyKwh: 0, co2eKg: 0 });
    services.countByStatus.mockResolvedValue({
      [ServiceStatus.ACTIVE]: 0,
      [ServiceStatus.UNAVAILABLE]: 0,
      [ServiceStatus.NO_METRICS]: 0,
    });

    await expect(metricsService.getSummary()).resolves.toEqual({
      total_energy_kwh: 0,
      total_co2e_kg: 0,
      services_count: {
        active: 0,
        unavailable: 0,
        no_metrics: 0,
      },
    });
  });

  it('persists fallback usage with the calculated emissions for audit', async () => {
    carbonIntensityClient.getIntensity.mockResolvedValue({
      intensityGco2ePerKwh: 120,
      usedFallback: true,
    });

    await metricsService.collectCycle();

    expect(collections.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        carbon_intensity_gco2e_per_kwh: '120.00000000',
        carbon_intensity_fallback: true,
        co2e_g: expect.any(String),
        co2e_kg: expect.any(String),
      }),
    );
  });

  it('continues collecting other services when a collection uses fallback', async () => {
    const secondService = {
      ...service,
      idServices: 'efc7aa92-c05f-4971-b711-5ad006752b3b',
      external_id: 'catalog-api',
      endpoint: '/metrics/catalog-api',
      region_code: null,
    } as Service;
    services.findAll.mockResolvedValue([service, secondService]);
    carbonIntensityClient.getIntensity
      .mockResolvedValueOnce({
        intensityGco2ePerKwh: 120,
        usedFallback: true,
      })
      .mockResolvedValueOnce({
        intensityGco2ePerKwh: 85,
        usedFallback: false,
      });

    await metricsService.collectCycle();

    expect(collections.createAndSave).toHaveBeenCalledTimes(2);
    expect(carbonIntensityClient.getIntensity).toHaveBeenCalledTimes(2);
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

    expect(collections.createAndSave).not.toHaveBeenCalled();
    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.NO_METRICS,
    );
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('billing-api'),
      expect.any(String),
    );
    loggerError.mockRestore();
  });

  it.each([
    ['null CPU', { cpu_percent: null }],
    ['null memory', { memory_gb: null }],
    ['null disk', { disk_gb: null }],
    ['null network', { network_gb: null }],
  ])('marks %s as NO_METRICS without persisting it', async (_caseName, override) => {
    aggregatorClient.fetchMetrics.mockResolvedValue({
      collection_interval_seconds: 27,
      metrics: {
        cpu_percent: 62.67,
        memory_gb: 3.17,
        disk_gb: 19.26,
        network_gb: 0.45,
        ...override,
      },
    });

    await metricsService.collectCycle();

    expect(collections.createAndSave).not.toHaveBeenCalled();
    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.NO_METRICS,
    );
  });

  it('skips active services without a discovered metrics endpoint', async () => {
    services.findAll.mockResolvedValue([{ ...service, endpoint: null }]);

    await metricsService.collectCycle();

    expect(aggregatorClient.fetchMetrics).not.toHaveBeenCalled();
    expect(collections.createAndSave).not.toHaveBeenCalled();
    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.NO_METRICS,
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
    services.findAll.mockResolvedValue([service, secondService]);
    aggregatorClient.fetchMetrics.mockRejectedValueOnce(error);

    await metricsService.collectCycle();

    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.UNAVAILABLE,
    );
    expect(collections.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({ service_id: secondService.idServices }),
    );
  });

  it('marks a service as NO_METRICS after HTTP 404 and continues the cycle', async () => {
    const secondService = {
      ...service,
      idServices: 'efc7aa92-c05f-4971-b711-5ad006752b3b',
      external_id: 'catalog-api',
    } as Service;
    services.findAll.mockResolvedValue([service, secondService]);
    aggregatorClient.fetchMetrics.mockRejectedValueOnce(
      new AggregatorHttpError('HTTP 404', '/metrics', 404),
    );

    await metricsService.collectCycle();

    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.NO_METRICS,
    );
    expect(services.updateStatus).not.toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.UNAVAILABLE,
    );
    expect(collections.createAndSave).toHaveBeenCalledWith(
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
    expect(collections.createAndSave).not.toHaveBeenCalled();
  });

  it('persists different states for HTTP 404 and HTTP 500 in the same cycle', async () => {
    const secondService = {
      ...service,
      idServices: 'efc7aa92-c05f-4971-b711-5ad006752b3b',
      external_id: 'catalog-api',
      endpoint: '/metrics/catalog-api',
    } as Service;
    services.findAll.mockResolvedValue([service, secondService]);
    aggregatorClient.fetchMetrics
      .mockRejectedValueOnce(new AggregatorHttpError('HTTP 404', '/metrics', 404))
      .mockRejectedValueOnce(new AggregatorHttpError('HTTP 500', '/metrics', 500));
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await metricsService.collectCycle();

    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.NO_METRICS,
    );
    expect(services.updateStatus).toHaveBeenCalledWith(
      secondService.idServices,
      ServiceStatus.UNAVAILABLE,
    );
  });

  it('reports a 404 endpoint as a warning without logging an exception stack', async () => {
    aggregatorClient.fetchMetrics.mockRejectedValue(
      new AggregatorHttpError('HTTP 404', '/metrics', 404),
    );
    const loggerWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await metricsService.collectCycle();

    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.NO_METRICS,
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

    expect(collections.createAndSave).not.toHaveBeenCalled();
    expect(services.updateStatus).toHaveBeenCalledWith(
      service.idServices,
      ServiceStatus.NO_METRICS,
    );
  });

  it.each([ServiceStatus.UNAVAILABLE, ServiceStatus.NO_METRICS])(
    'reactivates a service in %s after receiving valid metrics',
    async (status) => {
      service.status = status;

      await metricsService.collectCycle();

      expect(collections.createAndSave).toHaveBeenCalled();
      expect(services.updateStatus).toHaveBeenCalledWith(
        service.idServices,
        ServiceStatus.ACTIVE,
      );
    },
  );

  it('filters a service history by inclusive dates', async () => {
    const from = '2026-10-01T00:00:00.000Z';
    const to = '2026-10-02T00:00:00.000Z';

    await metricsService.findHistory(service.idServices, from, to);

    expect(services.findById).toHaveBeenCalledWith(service.idServices);
    expect(collections.findByService).toHaveBeenCalledWith(service.idServices, {
      from: new Date(from),
      to: new Date(to),
    });
  });

  it('rejects a history range whose start is after its end', async () => {
    await expect(
      metricsService.findHistory(
        service.idServices,
        '2026-10-02T00:00:00.000Z',
        '2026-10-01T00:00:00.000Z',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(collections.findByService).not.toHaveBeenCalled();
  });

  it('returns 404 for the history of an unknown service', async () => {
    services.findById.mockResolvedValue(null);

    await expect(
      metricsService.findHistory(service.idServices),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
