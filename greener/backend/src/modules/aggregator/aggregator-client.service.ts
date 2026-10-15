import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
    AggregatorClientError,
    AggregatorConfigError,
    AggregatorHttpError,
    AggregatorTimeoutError,
    AggregatorUnavailableError,
} from './aggregator.errors';
import { mapDiscoveryResponse } from './aggregator.mapper';
import { InternalDiscoveredService } from './types/aggregator.types';

const DEFAULT_TIMEOUT_MS = 5000;
const TIMEOUT_CODES = ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'];

@Injectable()
export class AggregatorClientService {
    private readonly logger = new Logger(AggregatorClientService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async fetchDiscoveredServices(): Promise<InternalDiscoveredService[]> {
        const url = this.buildUrl();
        const timeoutMs = this.timeoutMs;

        let data: unknown;
        try {
            const res = await firstValueFrom(
                this.httpService.get<unknown>(url, {
                    signal: AbortSignal.timeout(timeoutMs),
                    headers: { Accept: 'application/json' },
                }),
            );
            data = res.data;
        } catch (e) {
            throw this.toClientError(e, url, timeoutMs);
        }

        try {
            const { services, invalidCount } = mapDiscoveryResponse(data);
            if (invalidCount > 0) {
                this.logger.warn(`${invalidCount} item(ns) inválido(s) ignorado(s) na descoberta.`);
            }
            this.logger.log(`Descoberta concluída: ${services.length} serviço(s).`);
            return services;
        } catch (e) {
            if (e instanceof AggregatorClientError) {
                this.logger.error(`${e.name}: ${e.message} (${url})`);
            }
            throw e;
        }
    }

    private buildUrl(): string {
        const base = this.configService.get<string>('AGGREGATOR_API_URL');
        if (!base) {
            const err = new AggregatorConfigError('AGGREGATOR_API_URL não está definida.');
            this.logger.error(err.message);
            throw err;
        }
        const path = this.configService.get<string>('AGGREGATOR_SERVICES_PATH', '/services');
        return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    }

    private get timeoutMs(): number {
        const n = Number(this.configService.get('AGGREGATOR_TIMEOUT'));
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
    }

    private toClientError(e: unknown, url: string, timeoutMs: number): AggregatorClientError {
        if (isAxiosError(e)) {
            if (e.code && TIMEOUT_CODES.includes(e.code)) {
                const err = new AggregatorTimeoutError(`Timeout de ${timeoutMs}ms excedido.`, url);
                this.logger.warn(`${err.name}: ${err.message} (${url})`);
                return err;
            }
            if (e.response) {
                const err = new AggregatorHttpError(
                    `Agregador respondeu HTTP ${e.response.status}.`,
                    url,
                    e.response.status,
                );
                this.logger.error(`${err.name}: ${err.message} (${url})`);
                return err;
            }
        }
        const msg = e instanceof Error ? e.message : String(e);
        const err = new AggregatorUnavailableError(`Agregador inacessível: ${msg}`, url);
        this.logger.error(`${err.name}: ${err.message} (${url})`);
        return err;
    }
}