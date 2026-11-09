import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { CarbonIntensityClientService } from './carbon-intensity-client.service';

describe('CarbonIntensityClientService', () => {
  let httpService: { get: jest.Mock };
  let configService: { get: jest.Mock };
  let client: CarbonIntensityClientService;

  const validResponse = {
    region_code: 'br-sudeste',
    country: 'Brazil',
    region: 'Sudeste',
    city: 'Sao Paulo',
    carbon_intensity_gco2e_per_kwh: 85,
    renewable_share_percent: 83,
  };

  beforeEach(() => {
    httpService = {
      get: jest.fn().mockReturnValue(of({ data: validResponse })),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'CARBON_INTENSITY_FALLBACK_G_PER_KWH') return '410';
        return defaultValue;
      }),
    };
    client = new CarbonIntensityClientService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests the documented regional endpoint and returns gCO2e/kWh', async () => {
    await expect(client.getIntensity('br-sudeste')).resolves.toEqual({
      intensityGco2ePerKwh: 85,
      usedFallback: false,
    });

    expect(httpService.get).toHaveBeenCalledWith(
      'https://carbon.unilaunch.org/regions/br-sudeste/carbon-intensity',
      {
        timeout: 5000,
        headers: { Accept: 'application/json' },
      },
    );
  });

  it('uses the configured fallback and logs a warning on timeout', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() => new AxiosError('timeout', 'ECONNABORTED')),
    );
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(client.getIntensity('br-sudeste')).resolves.toEqual({
      intensityGco2ePerKwh: 410,
      usedFallback: true,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('fallback de intensidade de carbono'),
    );
  });

  it.each([
    [
      'an unknown region',
      Object.assign(new AxiosError('not found'), {
        response: { status: 404 },
      }),
    ],
    [
      'an HTTP 5xx',
      Object.assign(new AxiosError('server failure'), {
        response: { status: 503 },
      }),
    ],
  ])('uses the configured fallback for %s', async (_label, error) => {
    httpService.get.mockReturnValueOnce(throwError(() => error));

    await expect(client.getIntensity('br-sudeste')).resolves.toMatchObject({
      intensityGco2ePerKwh: 410,
      usedFallback: true,
    });
  });

  it('surfaces unexpected client errors instead of hiding them with fallback', async () => {
    httpService.get.mockReturnValueOnce(
      throwError(() =>
        Object.assign(new AxiosError('bad request'), {
          response: { status: 400 },
        }),
      ),
    );

    await expect(client.getIntensity('br-sudeste')).rejects.toThrow('HTTP 400');
  });

  it('uses the fallback and skips HTTP when there is no region code', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await expect(client.getIntensity(null)).resolves.toEqual({
      intensityGco2ePerKwh: 410,
      usedFallback: true,
    });

    expect(httpService.get).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('starts without a fallback and reports missing config only when fallback is needed', async () => {
    configService.get.mockImplementation(
      (key: string, defaultValue?: string) =>
        key === 'CARBON_INTENSITY_FALLBACK_G_PER_KWH'
          ? undefined
          : defaultValue,
    );
    const clientWithoutFallback = new CarbonIntensityClientService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
    );

    await expect(
      clientWithoutFallback.getIntensity('br-sudeste'),
    ).resolves.toMatchObject({
      intensityGco2ePerKwh: 85,
      usedFallback: false,
    });

    httpService.get.mockReturnValueOnce(
      throwError(() => new AxiosError('timeout', 'ECONNABORTED')),
    );
    await expect(
      clientWithoutFallback.getIntensity('br-sudeste'),
    ).rejects.toThrow('CARBON_INTENSITY_FALLBACK_G_PER_KWH');
  });

  it('uses the fallback for an invalid response', async () => {
    httpService.get.mockReturnValueOnce(
      of({
        data: {
          ...validResponse,
          carbon_intensity_gco2e_per_kwh: -1,
        },
      }),
    );

    await expect(client.getIntensity('br-sudeste')).resolves.toMatchObject({
      intensityGco2ePerKwh: 410,
      usedFallback: true,
    });
  });
});
