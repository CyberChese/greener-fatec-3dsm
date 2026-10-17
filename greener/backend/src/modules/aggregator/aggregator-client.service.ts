import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
    AggregatorClientError,
    AggregatorConfigError,
    AggregatorContractError,
    AggregatorHttpError,
    AggregatorTimeoutError,
    AggregatorUnavailableError,
} from './aggregator.errors';
import { mapDiscoveryResponse } from './aggregator.mapper';
import { DiscoveryResult } from './types/aggregator.types';

const DEFAULT_TIMEOUT_MS = 5000;
const TIMEOUT_CODES = ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'];

@Injectable()
export class AggregatorClientService {
    private readonly logger = new Logger(AggregatorClientService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}

    async fetchDiscoveredServices(): Promise<DiscoveryResult> {
        const url = this.buildUrl();
        const timeoutMs = this.timeoutMs;

        const data = await this.fetchJson(url, timeoutMs);

        try {
            const { services, invalidCount } = mapDiscoveryResponse(data);

            if (invalidCount > 0) {
                this.logger.warn(
                    `${invalidCount} item(ns) inválido(s) ignorado(s) na descoberta.`,
                );
            }

            this.logger.log(
                `Descoberta concluída: ${services.length} serviço(s).`,
            );

            return {
                services,
                isComplete: false,
            };
        } catch (e) {
            if (e instanceof AggregatorClientError) {
                this.logger.error(`${e.name}: ${e.message} (${url})`);
            }
            throw e;
        }
    }

    async fetchMetrics(metricsPath: string): Promise<unknown> {
        const baseUrl = this.buildBaseUrl();
        if (
            !metricsPath.startsWith('/') ||
            metricsPath.startsWith('//') ||
            /[?#]/.test(metricsPath)
        ) {
            throw new AggregatorContractError(
                'Caminho de métricas fora do contrato: esperado um caminho relativo.',
            );
        }

        const url = new URL(metricsPath, baseUrl);
        if (url.origin !== baseUrl.origin) {
            throw new AggregatorContractError(
                'Caminho de métricas fora do contrato: a origem não pode ser alterada.',
            );
        }

        return this.fetchJson(url.toString(), this.timeoutMs);
    }

    private async fetchJson(url: string, timeoutMs: number): Promise<unknown> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<unknown>(url, {
                    signal: AbortSignal.timeout(timeoutMs),
                    headers: { Accept: 'application/json' },
                }),
            );
            return response.data;
        } catch (error) {
            throw this.toClientError(error, url, timeoutMs);
        }
    }

    private buildUrl(): string {
        const base = this.buildBaseUrl().toString().replace(/\/+$/, '');
        const path = this.configService.get<string>(
            'AGGREGATOR_SERVICES_PATH',
            '/services',
        );
        return `${base}/${path.replace(/^\/+/, '')}`;
    }

    private buildBaseUrl(): URL {
        const base = this.configService.get<string>('AGGREGATOR_API_URL');
        if (!base) {
            const err = new AggregatorConfigError(
                'AGGREGATOR_API_URL não está definida.',
            );
            this.logger.error(err.message);
            throw err;
        }

        let url: URL;
        try {
            url = new URL(base);
        } catch {
            const err = new AggregatorConfigError(
                'AGGREGATOR_API_URL deve ser uma URL HTTP(S) válida.',
            );
            this.logger.error(err.message);
            throw err;
        }

        if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.search ||
            url.hash
        ) {
            const err = new AggregatorConfigError(
                'AGGREGATOR_API_URL deve ser uma URL HTTP(S) sem credenciais, query ou fragmento.',
            );
            this.logger.error(err.message);
            throw err;
        }

        return url;
    }

    private get timeoutMs(): number {
        const n = Number(this.configService.get('AGGREGATOR_TIMEOUT'));
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
    }

    private toClientError(
        e: unknown,
        url: string,
        timeoutMs: number,
    ): AggregatorClientError {
        if (isAxiosError(e)) {
            if (e.code && TIMEOUT_CODES.includes(e.code)) {
                const err = new AggregatorTimeoutError(
                    `Timeout de ${timeoutMs}ms excedido.`,
                    url,
                );
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
        const err = new AggregatorUnavailableError(
            `Agregador inacessível: ${msg}`,
            url,
        );
        this.logger.error(`${err.name}: ${err.message} (${url})`);
        return err;
    }
}