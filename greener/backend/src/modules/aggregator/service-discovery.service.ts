import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceStatus } from '../../entities/service.entity';
import { ServiceRepository } from '../../repositories/service.repository';
import { AggregatorClientService } from './aggregator-client.service';

@Injectable()
export class ServiceDiscoveryService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly discoveryIntervalMs: number;
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;

  constructor(
    private readonly aggregatorClient: AggregatorClientService,
    configService: ConfigService,
    private readonly serviceRepository: ServiceRepository,
  ) {
    const intervalSeconds = configService.get<number>(
      'SERVICE_DISCOVERY_INTERVAL_SECONDS',
    );
    this.discoveryIntervalMs = (intervalSeconds ?? 300) * 1000;
  }

  async synchronize(): Promise<number> {
    const { services, isComplete } =
      await this.aggregatorClient.fetchDiscoveredServices();

    if (!isComplete) {
      this.logger.warn(
        'Descoberta incompleta: os serviços recebidos serão sincronizados, mas omissões não indicarão remoção.',
      );
    }

    const existingServices = await this.serviceRepository.findAll();
    const existingByExternalId = new Map(
      existingServices.map(
        (service) => [service.external_id, service] as const,
      ),
    );
    const discoveredIds = new Set(services.map((service) => service.externalId));
    const newServicesCount = services.filter(
      (service) => !existingByExternalId.has(service.externalId),
    ).length;
    const observedAt = new Date();

    const rows = services.map((discovered) => {
      const previous = existingByExternalId.get(discovered.externalId);

      return {
        external_id: discovered.externalId,
        nameServices: discovered.name,
        endpoint: discovered.metricsPath ?? previous?.endpoint ?? null,
        region_code:
          discovered.location.regionCode ?? previous?.region_code ?? null,
        status: previous?.status ?? ServiceStatus.NO_METRICS,
        country: discovered.location.country ?? previous?.country ?? null,
        region: discovered.location.region ?? previous?.region ?? null,
        city: discovered.location.city ?? previous?.city ?? null,
        latitude:
          discovered.location.lat !== undefined
            ? String(discovered.location.lat)
            : (previous?.latitude ?? null),
        longitude:
          discovered.location.lng !== undefined
            ? String(discovered.location.lng)
            : (previous?.longitude ?? null),
        last_observed_at: observedAt,
      };
    });

    await this.serviceRepository.upsertByExternalId(rows);

    if (isComplete) {
      await this.serviceRepository.markUnavailableExcept([...discoveredIds]);
    }

    return newServicesCount;
  }

  onModuleInit(): void {
    void this.runDiscoveryCycle();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private async runDiscoveryCycle(): Promise<void> {
    const startedAt = Date.now();
    try {
      const newServicesCount = await this.synchronize();
      this.logger.log(
        JSON.stringify({
          event: 'service_discovery_completed',
          new_services_count: newServicesCount,
          duration_ms: Date.now() - startedAt,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'service_discovery_failed',
          new_services_count: null,
          duration_ms: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      if (!this.stopped) {
        this.timer = setTimeout(
          () => void this.runDiscoveryCycle(),
          this.discoveryIntervalMs,
        );
      }
    }
  }
}
