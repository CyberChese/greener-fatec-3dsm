import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

const DEFAULT_API_URL = 'https://carbon.unilaunch.org';
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 5000;

export interface CarbonIntensityResult {
  intensityGco2ePerKwh: number;
  usedFallback: boolean;
}

interface CarbonIntensityResponse {
  region_code: string;
  country: string;
  region: string;
  carbon_intensity_gco2e_per_kwh: number;
  renewable_share_percent: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class CarbonIntensityResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = CarbonIntensityResponseError.name;
  }
}

class CarbonIntensityApiError extends Error {
  constructor(statusCode: number) {
    super(`A API de intensidade de carbono respondeu HTTP ${statusCode}.`);
    this.name = CarbonIntensityApiError.name;
  }
}

@Injectable()
export class CarbonIntensityClientService {
  private readonly logger = new Logger(CarbonIntensityClientService.name);
  private readonly apiUrl: URL;
  private readonly timeoutMs: number;
  private readonly fallbackGPerKwh: number | undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.parseApiUrl(
      this.configService.get<string>(
        'CARBON_INTENSITY_API_URL',
        DEFAULT_API_URL,
      ),
    );
    this.timeoutMs = this.parseTimeout(
      this.configService.get<string>(
        'CARBON_INTENSITY_TIMEOUT_MS',
        String(DEFAULT_TIMEOUT_MS),
      ),
    );
    this.fallbackGPerKwh = this.parseFallback(
      this.configService.get<string>('CARBON_INTENSITY_FALLBACK_G_PER_KWH'),
    );
  }

  async getIntensity(
    regionCode: string | null | undefined,
  ): Promise<CarbonIntensityResult> {
    const normalizedRegionCode = regionCode?.trim();
    if (!normalizedRegionCode) {
      return this.useFallback('region_code ausente');
    }

    const url = new URL(
      `/regions/${encodeURIComponent(normalizedRegionCode)}/carbon-intensity`,
      this.apiUrl,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<unknown>(url.toString(), {
          timeout: this.timeoutMs,
          headers: { Accept: 'application/json' },
        }),
      );
      const response = this.parseResponse(data, normalizedRegionCode);

      return {
        intensityGco2ePerKwh: response.carbon_intensity_gco2e_per_kwh,
        usedFallback: false,
      };
    } catch (error) {
      if (error instanceof CarbonIntensityResponseError) {
        return this.useFallback(error.message, normalizedRegionCode);
      }

      if (isAxiosError(error)) {
        const statusCode = error.response?.status;
        if (statusCode !== undefined) {
          if (statusCode === 404 || statusCode >= 500) {
            const reason =
              statusCode === 404
                ? 'região não encontrada (HTTP 404)'
                : `HTTP ${statusCode}`;
            return this.useFallback(reason, normalizedRegionCode);
          }
          throw new CarbonIntensityApiError(statusCode);
        }

        const reason = this.isTimeout(error.code)
          ? 'timeout'
          : 'API indisponível';
        return this.useFallback(reason, normalizedRegionCode);
      }

      throw error;
    }
  }

  private parseResponse(
    value: unknown,
    requestedRegionCode: string,
  ): CarbonIntensityResponse {
    if (!isRecord(value)) {
      throw new CarbonIntensityResponseError('resposta fora do schema oficial');
    }

    const regionCode = value.region_code;
    const country = value.country;
    const region = value.region;
    const city = value.city;
    const intensity = value.carbon_intensity_gco2e_per_kwh;
    const renewableShare = value.renewable_share_percent;
    if (
      regionCode !== requestedRegionCode ||
      typeof country !== 'string' ||
      country.trim() === '' ||
      typeof region !== 'string' ||
      region.trim() === '' ||
      (city !== undefined && city !== null && typeof city !== 'string') ||
      typeof intensity !== 'number' ||
      !Number.isFinite(intensity) ||
      intensity < 0 ||
      typeof renewableShare !== 'number' ||
      !Number.isFinite(renewableShare) ||
      renewableShare < 0 ||
      renewableShare > 100
    ) {
      throw new CarbonIntensityResponseError(
        'resposta inválida ou incompatível com a região solicitada',
      );
    }

    return {
      region_code: regionCode,
      country,
      region,
      carbon_intensity_gco2e_per_kwh: intensity,
      renewable_share_percent: renewableShare,
    };
  }

  private useFallback(
    reason: string,
    regionCode?: string,
  ): CarbonIntensityResult {
    if (this.fallbackGPerKwh === undefined) {
      const error = new Error(
        'CARBON_INTENSITY_FALLBACK_G_PER_KWH deve ser configurada para aplicar o fallback.',
      );
      this.logger.error(error.message);
      throw error;
    }

    const region = regionCode ? ` para "${regionCode}"` : '';
    this.logger.warn(
      `Usando fallback de intensidade de carbono${region}: ${reason}. Fator configurado: ${this.fallbackGPerKwh} gCO₂e/kWh.`,
    );

    return {
      intensityGco2ePerKwh: this.fallbackGPerKwh,
      usedFallback: true,
    };
  }

  private isTimeout(code: string | undefined): boolean {
    return (
      code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ERR_CANCELED'
    );
  }

  private parseApiUrl(value: string): URL {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error(
        'CARBON_INTENSITY_API_URL deve ser uma URL HTTP(S) válida.',
      );
    }

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        'CARBON_INTENSITY_API_URL deve ser uma URL HTTP(S) sem credenciais, query ou fragmento.',
      );
    }

    return url;
  }

  private parseTimeout(value: string): number {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new Error(
        'CARBON_INTENSITY_TIMEOUT_MS deve ser um inteiro positivo.',
      );
    }

    const timeoutMs = Number(value);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs > MAX_TIMEOUT_MS) {
      throw new Error(
        `CARBON_INTENSITY_TIMEOUT_MS deve ser no máximo ${MAX_TIMEOUT_MS}.`,
      );
    }
    return timeoutMs;
  }

  private parseFallback(value: string | undefined): number | undefined {
    if (value === undefined || value.trim() === '') {
      return undefined;
    }

    const fallback = Number(value);
    if (
      !/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()) ||
      !Number.isFinite(fallback) ||
      fallback < 0
    ) {
      throw new Error(
        'CARBON_INTENSITY_FALLBACK_G_PER_KWH deve ser configurada com um número não negativo.',
      );
    }
    return fallback;
  }
}
