import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { AggregatorClientService } from './aggregator-client.service';
import {
    AggregatorConfigError,
    AggregatorContractError,
    AggregatorHttpError,
    AggregatorTimeoutError,
    AggregatorUnavailableError,
} from './aggregator.errors';

const env: Record<string, string> = {
    AGGREGATOR_API_URL: 'https://agg.test/',
    AGGREGATOR_TIMEOUT: '100',
};
const config = {
    get: (k: string, def?: string) => env[k] ?? def,
} as unknown as ConfigService;

describe('AggregatorClientService', () => {
    const get = jest.fn();
    let service: AggregatorClientService;

    beforeEach(() => {
        get.mockReset();
        service = new AggregatorClientService(
            { get } as unknown as HttpService,
            config,
        );
    });

    it('converte o contrato real para o tipo interno preservando id e metrics_path', async () => {
        get.mockReturnValue(
            of({
                data: [
                    {
                        id: 'billing-api',
                        name: 'Billing API',
                        location: {
                            region_code: 'br-sudeste',
                            country: 'Brazil',
                            region: 'Sudeste',
                            city: 'Sao Paulo',
                            latitude: -23.5505,
                            longitude: -46.6333,
                        },
                        metrics_path: '/metrics/billing-api',
                    },
                    { id: 'sem-local', name: 'Sem Local', metrics_path: '/metrics/sem-local' },
                    { name: 'sem id', metrics_path: '/metrics/x' },
                ],
            }),
        );
        const result = await service.fetchDiscoveredServices();
        expect(get.mock.calls[0][0]).toBe('https://agg.test/services');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            externalId: 'billing-api',
            name: 'Billing API',
            metricsPath: '/metrics/billing-api',
            location: {
                regionCode: 'br-sudeste',
                country: 'Brazil',
                region: 'Sudeste',
                city: 'Sao Paulo',
                lat: -23.5505,
                lng: -46.6333,
            },
        });

        expect(result[1].externalId).toBe('sem-local');
        expect(result[1].location.lat).toBeUndefined();
    });

    it('rejeita resposta que não é array', async () => {
        get.mockReturnValue(of({ data: { services: [] } }));
        await expect(service.fetchDiscoveredServices()).rejects.toBeInstanceOf(
            AggregatorContractError,
        );
    });

    it('trata timeout com erro tipado, sem travar', async () => {
        get.mockReturnValue(
            throwError(() => new AxiosError('timeout', 'ECONNABORTED')),
        );
        await expect(service.fetchDiscoveredServices()).rejects.toBeInstanceOf(
            AggregatorTimeoutError,
        );
    });

    it('trata HTTP 500', async () => {
        const err = new AxiosError(
            'fail',
            'ERR_BAD_RESPONSE',
            undefined,
            undefined,
            { status: 500 } as never,
        );
        get.mockReturnValue(throwError(() => err));
        await expect(service.fetchDiscoveredServices()).rejects.toBeInstanceOf(
            AggregatorHttpError,
        );
    });

    it('trata falha de rede', async () => {
        get.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
        await expect(service.fetchDiscoveredServices()).rejects.toBeInstanceOf(
            AggregatorUnavailableError,
        );
    });

    it('falha de configuração não derruba a aplicação: só a chamada', async () => {
        const noEnv = new AggregatorClientService(
            { get } as unknown as HttpService,
            { get: () => undefined } as unknown as ConfigService,
        );
        await expect(noEnv.fetchDiscoveredServices()).rejects.toBeInstanceOf(
            AggregatorConfigError,
        );
    });
});