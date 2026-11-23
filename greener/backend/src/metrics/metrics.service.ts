import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseDateRange } from '../common/date-range';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import { MetricCollectionRepository } from '../repositories/metric-collection.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AggregatorClientService } from '../modules/aggregator/aggregator-client.service';
import {
  AggregatorHttpError,
  AggregatorTimeoutError,
  AggregatorUnavailableError,
} from '../modules/aggregator/aggregator.errors';

import { EnergyEngineService } from '../engine/energy-engine.service';
import { CarbonEngineService } from '../engine/carbon-engine.service';
import { CarbonIntensityClientService } from '../modules/carbon-intensity/carbon-intensity-client.service';

const DEFAULT_COLLECTION_INTERVAL_SECONDS = 30;
const HTTP_NOT_FOUND = 404;
const MAX_INTERVAL_SECONDS = Math.floor(2_147_483_647 / 1000);

export interface MetricsSummary {
  total_energy_kwh: number;
  total_co2e_kg: number;
  services_count: {
    active: number;
    unavailable: number;
    no_metrics: number;
  };
}

interface AggregatorMetrics {
  cpu_percent: number;
  memory_gb: number;
  disk_gb: number;
  network_gb: number;
}

interface AggregatorMetricsResponse {
  collection_interval_seconds: number;
  metrics: AggregatorMetrics;
}

class MetricsContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = MetricsContractError.name;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseMetricsResponse(value: unknown): AggregatorMetricsResponse {
  if (!isRecord(value) || !isRecord(value.metrics)) {
    throw new MetricsContractError(
      'Metrics Aggregator returned an invalid metrics response.',
    );
  }

  const collectionIntervalSeconds = value.collection_interval_seconds;
  const { cpu_percent, memory_gb, disk_gb, network_gb } = value.metrics;

  if (
    typeof collectionIntervalSeconds !== 'number' ||
    !Number.isSafeInteger(collectionIntervalSeconds) ||
    collectionIntervalSeconds <= 0 ||
    collectionIntervalSeconds > MAX_INTERVAL_SECONDS ||
    !isNonNegativeNumber(cpu_percent) ||
    cpu_percent > 100 ||
    !isNonNegativeNumber(memory_gb) ||
    !isNonNegativeNumber(disk_gb) ||
    !isNonNegativeNumber(network_gb)
  ) {
    throw new MetricsContractError(
      'Metrics Aggregator returned metrics outside the documented contract.',
    );
  }

  return {
    collection_interval_seconds: collectionIntervalSeconds,
    metrics: {
      cpu_percent,
      memory_gb,
      disk_gb,
      network_gb,
    },
  };
}

/**
 * Regra de estado persistido para falhas ao buscar as métricas de um serviço.
 *
 * - HTTP 404: o Agregador respondeu, mas informa que o serviço foi removido ou
 *   não tem métricas (OpenAPI). O serviço é alcançável, portanto não fica
 *   `UNAVAILABLE`: passa a `NO_METRICS`.
 * - Timeout, falha de conexão ou HTTP 5xx/outros: o Agregador não entregou
 *   uma resposta utilizável. O serviço passa a `UNAVAILABLE`.
 *
 * Em ambos os casos o histórico é preservado e o serviço volta a `ACTIVE` no
 * primeiro ciclo seguinte que receber métricas válidas.
 */
function statusForFetchError(error: unknown): ServiceStatus | undefined {
  if (error instanceof AggregatorHttpError && error.statusCode === HTTP_NOT_FOUND) {
    return ServiceStatus.NO_METRICS;
  }
  if (
    error instanceof AggregatorHttpError ||
    error instanceof AggregatorTimeoutError ||
    error instanceof AggregatorUnavailableError
  ) {
    return ServiceStatus.UNAVAILABLE;
  }
  return undefined;
}

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private readonly collectionIntervalSeconds: number;
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;

  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly collectionRepository: MetricCollectionRepository,
    private readonly energyEngineService: EnergyEngineService,
    private readonly carbonEngineService: CarbonEngineService,
    configService: ConfigService,
    private readonly aggregatorClient: AggregatorClientService,
    private readonly carbonIntensityClient: CarbonIntensityClientService,
  ) {
    const configuredInterval = configService.get<string>(
      'METRICS_COLLECTION_INTERVAL_SECONDS',
    );
    this.collectionIntervalSeconds =
      configuredInterval === undefined
        ? DEFAULT_COLLECTION_INTERVAL_SECONDS
        : this.parseInterval(configuredInterval);
  }

  onModuleInit(): void {
    this.scheduleNextCycle(this.collectionIntervalSeconds * 1000);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  async getCollectionConfig(): Promise<{
    interval_seconds: number;
    last_collection_at: Date | null;
  }> {
    return {
      interval_seconds: this.collectionIntervalSeconds,
      last_collection_at: await this.collectionRepository.findLatestTimestamp(),
    };
  }

  async getSummary(): Promise<MetricsSummary> {
    const [totals, statusCount] = await Promise.all([
      this.collectionRepository.sumImpact(),
      this.serviceRepository.countByStatus(),
    ]);

    return {
      total_energy_kwh: totals.energyKwh,
      total_co2e_kg: totals.co2eKg,
      services_count: {
        active: statusCount[ServiceStatus.ACTIVE],
        unavailable: statusCount[ServiceStatus.UNAVAILABLE],
        no_metrics: statusCount[ServiceStatus.NO_METRICS],
      },
    };
  }

  async collectCycle(): Promise<void> {
    const services = await this.serviceRepository.findAll();

    for (const service of services) {
      if (!service.endpoint) {
        await this.updateServiceStatus(service, ServiceStatus.NO_METRICS);
        this.logger.warn(
          `Metric collection skipped for service "${service.external_id}": no metrics endpoint is configured.`,
        );
        continue;
      }

      try {
        await this.collectService(service, service.endpoint);
      } catch (error) {
        if (
          error instanceof AggregatorHttpError &&
          error.statusCode === HTTP_NOT_FOUND
        ) {
          this.logger.warn(
            `Metrics endpoint for service "${service.external_id}" returned HTTP 404; service marked as NO_METRICS and will be retried.`,
          );
          continue;
        }

        const detail = error instanceof Error ? error.stack : String(error);
        this.logger.error(
          `Metric collection failed for service "${service.external_id}".`,
          detail,
        );
      }
    }
  }

  async findHistory(
    serviceId: string,
    fromValue?: string,
    toValue?: string,
  ): Promise<MetricCollection[]> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException(`Service "${serviceId}" was not found.`);
    }

    const range = parseDateRange(fromValue, toValue, 'from', 'to');
    return this.collectionRepository.findByService(serviceId, range);
  }

  private parseInterval(value: string): number {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new Error(
        'METRICS_COLLECTION_INTERVAL_SECONDS must be a positive integer.',
      );
    }

    const seconds = Number(value);
    if (!Number.isSafeInteger(seconds) || seconds > MAX_INTERVAL_SECONDS) {
      throw new Error(
        `METRICS_COLLECTION_INTERVAL_SECONDS must be at most ${MAX_INTERVAL_SECONDS}.`,
      );
    }
    return seconds;
  }

  private scheduleNextCycle(delayMs: number): void {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.runScheduledCycle();
    }, delayMs);
  }

  private async runScheduledCycle(): Promise<void> {
    try {
      await this.collectCycle();
    } catch (error) {
      const detail = error instanceof Error ? error.stack : String(error);
      this.logger.error('Scheduled metric collection cycle failed.', detail);
    } finally {
      this.scheduleNextCycle(this.collectionIntervalSeconds * 1000);
    }
  }

  private async collectService(service: Service, metricsPath: string): Promise<void> {
    let metricsResponse: AggregatorMetricsResponse;
    try {
      metricsResponse = parseMetricsResponse(
        await this.aggregatorClient.fetchMetrics(metricsPath),
      );
    } catch (error) {
      const status =
        error instanceof MetricsContractError
          ? ServiceStatus.NO_METRICS
          : statusForFetchError(error);
      if (status) {
        await this.updateServiceStatus(service, status);
      }
      throw error;
    }

    const { metrics } = metricsResponse;
    const timestamp = new Date();

    const energyKwh = this.energyEngineService.calculatekWh({
      cpuUsagePercent: metrics.cpu_percent,
      memoryUsedMb: metrics.memory_gb * 1024,
      // O Agregador informa disco e rede em GB, sem janela para derivar taxas MB/s.
      durationSeconds: metricsResponse.collection_interval_seconds,
    });
    const carbonIntensity = await this.carbonIntensityClient.getIntensity(
      service.region_code,
    );
    const carbonEmission = this.carbonEngineService.calculateEmission(
      energyKwh,
      carbonIntensity.intensityGco2ePerKwh,
    );

    await this.collectionRepository.createAndSave({
      service_id: service.idServices,
      service,
      cpu_usage: String(metrics.cpu_percent),
      memory_usage: String(metrics.memory_gb),
      storage_usage: String(metrics.disk_gb),
      network_io: String(metrics.network_gb),
      energy_kwh: Number(energyKwh),
      carbon_intensity_gco2e_per_kwh: carbonEmission.intensityGco2ePerKwh,
      co2e_g: carbonEmission.emissionGrams,
      co2e_kg: carbonEmission.emissionKilograms,
      carbon_intensity_fallback: carbonIntensity.usedFallback,
      timestamp,
    });
    await this.updateServiceStatus(service, ServiceStatus.ACTIVE);
  }

  private async updateServiceStatus(
    service: Service,
    status: ServiceStatus,
  ): Promise<void> {
    if (service.status === status) {
      return;
    }

    await this.serviceRepository.updateStatus(service.idServices, status);
    service.status = status;
  }
}
