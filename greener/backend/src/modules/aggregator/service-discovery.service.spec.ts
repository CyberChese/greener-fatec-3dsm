import { QueryRunner, Repository } from 'typeorm';
import { Service, ServiceStatus } from '../../entities/service.entity';
import { AddRegionCodeToServices1792082026000 } from '../../migrations/1792082026000-AddRegionCodeToServices';
import { AggregatorClientService } from './aggregator-client.service';
import { mapDiscoveryResponse } from './aggregator.mapper';
import { ServiceDiscoveryService } from './service-discovery.service';

describe('ServiceDiscoveryService', () => {
  let aggregatorClient: { fetchDiscoveredServices: jest.Mock };
  let updateQuery: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  let serviceRepository: {
    find: jest.Mock;
    upsert: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let discoveryService: ServiceDiscoveryService;

  beforeEach(() => {
    aggregatorClient = {
      fetchDiscoveredServices: jest.fn().mockResolvedValue({
        services: [],
        isComplete: false,
      }),
    };
    updateQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    serviceRepository = {
      find: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(updateQuery),
    };
    discoveryService = new ServiceDiscoveryService(
      aggregatorClient as unknown as AggregatorClientService,
      serviceRepository as unknown as Repository<Service>,
    );
  });

  it('marks omitted services unavailable after a complete discovery', async () => {
    aggregatorClient.fetchDiscoveredServices.mockResolvedValue({
      services: [],
      isComplete: true,
    });

    await discoveryService.synchronize();

    expect(serviceRepository.createQueryBuilder).toHaveBeenCalled();
    expect(updateQuery.set).toHaveBeenCalledWith({
      status: ServiceStatus.UNAVAILABLE,
    });
    expect(updateQuery.execute).toHaveBeenCalled();
  });

  it('does not mark omitted services unavailable after an incomplete discovery', async () => {
    await discoveryService.synchronize();

    expect(serviceRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('preserves existing metric status and does not activate new services prematurely', async () => {
    aggregatorClient.fetchDiscoveredServices.mockResolvedValue({
      services: [
        {
          externalId: 'billing-api',
          name: 'Billing API',
          metricsPath: '/metrics/billing-api',
          location: { regionCode: 'br-sudeste' },
        },
        {
          externalId: 'new-service',
          name: 'New Service',
          metricsPath: '/metrics/new-service',
          location: {},
        },
      ],
      isComplete: false,
    });
    serviceRepository.find.mockResolvedValue([
      {
        external_id: 'billing-api',
        status: ServiceStatus.UNAVAILABLE,
      },
    ]);

    await discoveryService.synchronize();

    expect(serviceRepository.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          external_id: 'billing-api',
          status: ServiceStatus.UNAVAILABLE,
          region_code: 'br-sudeste',
        }),
        expect.objectContaining({
          external_id: 'new-service',
          status: ServiceStatus.NO_METRICS,
          region_code: null,
        }),
      ],
      ['external_id'],
    );
  });

  it('updates the stored region code when discovery reports a new one', async () => {
    aggregatorClient.fetchDiscoveredServices.mockResolvedValue({
      services: [
        {
          externalId: 'billing-api',
          name: 'Billing API',
          location: { regionCode: 'br-sul' },
        },
      ],
      isComplete: false,
    });
    serviceRepository.find.mockResolvedValue([
      {
        external_id: 'billing-api',
        region_code: 'br-sudeste',
        status: ServiceStatus.ACTIVE,
      },
    ]);

    await discoveryService.synchronize();

    expect(serviceRepository.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          external_id: 'billing-api',
          region_code: 'br-sul',
          status: ServiceStatus.ACTIVE,
        }),
      ],
      ['external_id'],
    );
  });

  it('does not change service states when discovery fails', async () => {
    aggregatorClient.fetchDiscoveredServices.mockRejectedValue(
      new Error('Aggregator unavailable'),
    );

    await expect(discoveryService.synchronize()).rejects.toThrow(
      'Aggregator unavailable',
    );
    expect(serviceRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(serviceRepository.upsert).not.toHaveBeenCalled();
  });

  it('does not invent a region_code when location or region_code is absent and preserves synchronization', async () => {
    const mapped = mapDiscoveryResponse([
      {
        id: 'auth-api',
        name: 'Auth API',
      },
      {
        id: 'search-api',
        name: 'Search API',
        location: { region_code: '   ', country: 'Brazil' },
      },
      {
        id: 'payments-api',
        name: 'Payments API',
        location: { region_code: 'us-east-1', country: 'USA' },
      },
    ]);

    expect(mapped.invalidCount).toBe(0);
    expect(mapped.services).toHaveLength(3);
    expect(mapped.services[0].location.regionCode).toBeUndefined();
    expect(mapped.services[1].location.regionCode).toBeUndefined();
    expect(mapped.services[2].location.regionCode).toBe('us-east-1');

    aggregatorClient.fetchDiscoveredServices.mockResolvedValue({
      services: mapped.services,
      isComplete: true,
    });
    serviceRepository.find.mockResolvedValue([]);

    await discoveryService.synchronize();

    expect(serviceRepository.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          external_id: 'auth-api',
          region_code: null,
        }),
        expect.objectContaining({
          external_id: 'search-api',
          region_code: null,
          country: 'Brazil',
        }),
        expect.objectContaining({
          external_id: 'payments-api',
          region_code: 'us-east-1',
          country: 'USA',
        }),
      ],
      ['external_id'],
    );
  });
});

describe('AddRegionCodeToServices1792082026000 migration', () => {
  it('adds region_code column on up and drops it on down (reversible)', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;
    const migration = new AddRegionCodeToServices1792082026000();

    await migration.up(queryRunner);
    expect(query).toHaveBeenNthCalledWith(
      1,
      'ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "region_code" character varying(100)',
    );

    await migration.down(queryRunner);
    expect(query).toHaveBeenNthCalledWith(
      2,
      'ALTER TABLE "services" DROP COLUMN IF EXISTS "region_code"',
    );
  });
});
