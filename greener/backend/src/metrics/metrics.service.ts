import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import { AggregatorClientService } from '../modules/aggregator/aggregator-client.service';
import {
  AggregatorHttpError,
  AggregatorTimeoutError,
  AggregatorUnavailableError,
} from '../modules/aggregator/aggregator.errors';

const DEFAULT_COLLECTION_INTERVAL_SECONDS = 30;
const HTTP_NOT_FOUND = 404;
const MAX_INTERVAL_SECONDS = Math.floor(2_147_483_647 / 1000);

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
    !Number.isInteger(collectionIntervalSeconds) ||
    collectionIntervalSeconds < 0 ||
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

function parseDateParameter(value: string | undefined, name: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Query parameter "${name}" must be a valid date.`);
  }
  return date;
}

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private readonly collectionIntervalSeconds: number;
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;

  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(MetricCollection)
    private readonly collectionRepository: Repository<MetricCollection>,
    configService: ConfigService,
    private readonly aggregatorClient: AggregatorClientService,
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
    const [latestCollection] = await this.collectionRepository.find({
      select: { timestamp: true },
      order: { timestamp: 'DESC' },
      take: 1,
    });

    return {
      interval_seconds: this.collectionIntervalSeconds,
      last_collection_at: latestCollection?.timestamp ?? null,
    };
  }

  async collectCycle(): Promise<void> {
    const activeServices = await this.serviceRepository.find({
      where: { status: In(Object.values(ServiceStatus)) },
    });

    for (const service of activeServices) {
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
    const service = await this.serviceRepository.findOneBy({ idServices: serviceId });
    if (!service) {
      throw new NotFoundException(`Service "${serviceId}" was not found.`);
    }

    const from = parseDateParameter(fromValue, 'from');
    const to = parseDateParameter(toValue, 'to');
    if (from && to && from > to) {
      throw new BadRequestException('"from" must be earlier than or equal to "to".');
    }

    const where: FindOptionsWhere<MetricCollection> = { service_id: serviceId };
    if (from && to) {
      where.timestamp = Between(from, to);
    } else if (from) {
      where.timestamp = MoreThanOrEqual(from);
    } else if (to) {
      where.timestamp = LessThanOrEqual(to);
    }

    return this.collectionRepository.find({
      where,
      order: { timestamp: 'ASC' },
    });
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

    await this.collectionRepository.save(
      this.collectionRepository.create({
        service_id: service.idServices,
        service,
        cpu_usage: String(metrics.cpu_percent),
        memory_usage: String(metrics.memory_gb),
        storage_usage: String(metrics.disk_gb),
        network_io: String(metrics.network_gb),
        timestamp,
      }),
    );
    await this.updateServiceStatus(service, ServiceStatus.ACTIVE);
  }

  private async updateServiceStatus(
    service: Service,
    status: ServiceStatus,
  ): Promise<void> {
    if (service.status === status) {
      return;
    }

    await this.serviceRepository.update(
      { idServices: service.idServices },
      { status },
    );
    service.status = status;
  }
}
