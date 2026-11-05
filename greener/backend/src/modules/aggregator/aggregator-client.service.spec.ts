import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import {
  AggregatorHttpError,
  AggregatorTimeoutError,
} from './aggregator.errors';
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

  it('converts a timeout into an AggregatorTimeoutError', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() => new AxiosError('timeout', 'ECONNABORTED')),
    );

    await expect(client.fetchDiscoveredServices()).rejects.toBeInstanceOf(
      AggregatorTimeoutError,
    );
  });

  it('converts an HTTP failure into an AggregatorHttpError', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() =>
        Object.assign(new AxiosError('server failure'), {
          response: { status: 503 },
        }),
      ),
    );

    await expect(client.fetchDiscoveredServices()).rejects.toBeInstanceOf(
      AggregatorHttpError,
    );
  });
});
