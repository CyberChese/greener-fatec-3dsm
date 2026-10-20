import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AggregatorClientService } from './aggregator-client.service';

describe('AggregatorClientService', () => {
  const aggregatorResponse = [
    {
      id: 'billing-api',
      name: 'Billing API',
      metrics_path: '/metrics/billing-api',
    },
  ];
  let httpService: { get: jest.Mock };
  let configService: { get: jest.Mock };
  let client: AggregatorClientService;

  beforeEach(() => {
    httpService = {
      get: jest.fn().mockReturnValue(of({ data: aggregatorResponse })),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'AGGREGATOR_API_URL') return 'https://metrics.example';
        return defaultValue;
      }),
    };
    client = new AggregatorClientService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
    );
  });

  it('marks a fully valid discovery response complete', async () => {
    await expect(client.fetchDiscoveredServices()).resolves.toMatchObject({
      isComplete: true,
      services: [{ externalId: 'billing-api' }],
    });
  });

  it('marks a discovery response with invalid entries incomplete', async () => {
    httpService.get.mockReturnValue(
      of({
        data: [...aggregatorResponse, { id: 'missing-name' }],
      }),
    );

    await expect(client.fetchDiscoveredServices()).resolves.toMatchObject({
      isComplete: false,
      services: [{ externalId: 'billing-api' }],
    });
  });
});
