import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service, ServiceStatus } from '../../entities/service.entity';
import { AggregatorClientService } from './aggregator-client.service';

@Injectable()
export class ServiceDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(ServiceDiscoveryService.name);

  constructor(
    private readonly aggregatorClient: AggregatorClientService,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async synchronize(): Promise<void> {
    const { services, isComplete } =
      await this.aggregatorClient.fetchDiscoveredServices();

    if (!isComplete) {
      this.logger.warn(
        'Descoberta incompleta: os serviços recebidos serão sincronizados, mas omissões não indicarão remoção.',
      );
    }

    const existingServices = await this.serviceRepository.find();
    const existingByExternalId = new Map(
      existingServices.map(
        (service) => [service.external_id, service] as const,
      ),
    );
    const observedAt = new Date();

    const rows = services.map((discovered) => {
      const previous = existingByExternalId.get(discovered.externalId);

      return {
        external_id: discovered.externalId,
        nameServices: discovered.name,
        endpoint: discovered.metricsPath ?? previous?.endpoint ?? null,
        status: previous?.status ?? ServiceStatus.NO_METRICS,
        country: discovered.location.country ?? previous?.country ?? null,
        region: discovered.location.region ?? previous?.region ?? null,
        city: discovered.location.city ?? previous?.city ?? null,
        latitude:
          discovered.location.lat !== undefined
            ? String(discovered.location.lat)
            : previous?.latitude ?? null,
        longitude:
          discovered.location.lng !== undefined
            ? String(discovered.location.lng)
            : previous?.longitude ?? null,
        last_observed_at: observedAt,
      };
    });

    if (rows.length > 0) {
      await this.serviceRepository.upsert(rows, ['external_id']);
    }

    if (isComplete) {
      const discoveredIds = services.map((service) => service.externalId);

      const updateQuery = this.serviceRepository
        .createQueryBuilder()
        .update(Service)
        .set({ status: ServiceStatus.UNAVAILABLE });

      if (discoveredIds.length > 0) {
        updateQuery.where('"external_id" NOT IN (:...discoveredIds)', {
          discoveredIds,
        });
      }

      await updateQuery.execute();
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.synchronize();
    } catch (error) {
      this.logger.error(
        'Não foi possível sincronizar os serviços na inicialização.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}