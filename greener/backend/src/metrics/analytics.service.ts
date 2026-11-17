import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseDateRange } from '../common/date-range';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service } from '../entities/service.entity';
import { MetricCollectionRepository } from '../repositories/metric-collection.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { CompareQueryDto } from './dto/compare-query.dto';
import { RankingQueryDto } from './dto/ranking-query.dto';

const DEFAULT_BUCKET_SECONDS = 30;

export interface RankingItem {
  rank: number;
  service_id: string;
  external_id: string;
  name: string;
  status: Service['status'];
  metric_value: number;
}

export interface RankingResult {
  metric: 'energy' | 'co2e';
  order: 'asc' | 'desc';
  startDate: string | null;
  endDate: string | null;
  items: RankingItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CompareMetricPoint {
  cpu_usage: number | null;
  energy_kwh: number | null;
  co2e_kg: number | null;
}

export interface CompareSeriesPoint {
  timestamp: string;
  values: Record<string, CompareMetricPoint>;
}

export interface CompareServiceSummary {
  service_id: string;
  external_id: string;
  name: string;
  status: Service['status'];
  samples_count: number;
  avg_cpu_usage: number | null;
  total_energy_kwh: number;
  total_co2e_kg: number;
}

export interface CompareStatisticalSummary {
  most_polluting_service_id: string | null;
  least_polluting_service_id: string | null;
  most_polluting_co2e_kg: number | null;
  least_polluting_co2e_kg: number | null;
  co2e_difference_kg: number | null;
  efficiency_difference_percent: number | null;
}

export interface CompareResult {
  startDate: string | null;
  endDate: string | null;
  bucketSeconds: number;
  services: CompareServiceSummary[];
  series: CompareSeriesPoint[];
  summary: CompareStatisticalSummary;
}

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractCo2eKg(collection: MetricCollection): number | null {
  const kg = toNullableNumber(collection.co2e_kg);
  if (kg !== null) {
    return kg;
  }
  const grams = toNullableNumber(collection.co2e_g);
  return grams !== null ? grams / 1000 : null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly collectionRepository: MetricCollectionRepository,
  ) {}

  async getRanking(query: RankingQueryDto): Promise<RankingResult> {
    const range = parseDateRange(query.startDate, query.endDate, 'startDate', 'endDate');

    const [rows, total] = await Promise.all([
      this.serviceRepository.findImpactRanking({
        metric: query.metric,
        order: query.order,
        page: query.page,
        limit: query.limit,
        ...range,
      }),
      this.serviceRepository.count(),
    ]);

    return {
      metric: query.metric,
      order: query.order,
      startDate: query.startDate ?? null,
      endDate: query.endDate ?? null,
      items: rows.map((row, index) => ({
        rank: (query.page - 1) * query.limit + index + 1,
        ...row,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async compareServices(query: CompareQueryDto): Promise<CompareResult> {
    if (
      !Array.isArray(query.serviceIds) ||
      query.serviceIds.length < 2 ||
      query.serviceIds.length > 4 ||
      new Set(query.serviceIds).size !== query.serviceIds.length
    ) {
      throw new BadRequestException(
        'Between 2 and 4 unique "serviceIds" must be provided.',
      );
    }

    const range = parseDateRange(query.startDate, query.endDate, 'startDate', 'endDate');

    const bucketSeconds = query.bucketSeconds ?? DEFAULT_BUCKET_SECONDS;
    if (!Number.isInteger(bucketSeconds) || bucketSeconds <= 0) {
      throw new BadRequestException('"bucketSeconds" must be a positive integer.');
    }
    const bucketMs = bucketSeconds * 1000;

    const foundServices = await this.serviceRepository.findByIdentifiers(
      query.serviceIds,
    );

    const orderedServices: Service[] = [];
    const missingIds: string[] = [];
    for (const requestedId of query.serviceIds) {
      const match = foundServices.find(
        (s) => s.idServices === requestedId || s.external_id === requestedId,
      );
      if (!match) {
        missingIds.push(requestedId);
      } else {
        orderedServices.push(match);
      }
    }

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Services not found: ${missingIds.join(', ')}.`,
      );
    }

    const resolvedIds = orderedServices.map((s) => s.idServices);
    if (new Set(resolvedIds).size !== resolvedIds.length) {
      throw new BadRequestException(
        'Duplicate services are not allowed in comparison.',
      );
    }

    const collections = await this.collectionRepository.findByServices(
      resolvedIds,
      range,
    );

    interface BucketAccumulator {
      cpuSum: number;
      cpuCount: number;
      energySum: number;
      energyCount: number;
      co2eSum: number;
      co2eCount: number;
    }

    const buckets = new Map<number, Map<string, BucketAccumulator>>();
    const serviceAccumulators = new Map<
      string,
      {
        samplesCount: number;
        cpuSum: number;
        cpuCount: number;
        energySum: number;
        co2eSum: number;
      }
    >();

    for (const service of orderedServices) {
      serviceAccumulators.set(service.idServices, {
        samplesCount: 0,
        cpuSum: 0,
        cpuCount: 0,
        energySum: 0,
        co2eSum: 0,
      });
    }

    for (const col of collections) {
      const ts = new Date(col.timestamp).getTime();
      if (Number.isNaN(ts)) {
        continue;
      }
      const alignedMs = Math.floor(ts / bucketMs) * bucketMs;
      let serviceMap = buckets.get(alignedMs);
      if (!serviceMap) {
        serviceMap = new Map<string, BucketAccumulator>();
        buckets.set(alignedMs, serviceMap);
      }

      let bucketAcc = serviceMap.get(col.service_id);
      if (!bucketAcc) {
        bucketAcc = {
          cpuSum: 0,
          cpuCount: 0,
          energySum: 0,
          energyCount: 0,
          co2eSum: 0,
          co2eCount: 0,
        };
        serviceMap.set(col.service_id, bucketAcc);
      }

      const cpu = toNullableNumber(col.cpu_usage);
      const energy = toNullableNumber(col.energy_kwh);
      const co2e = extractCo2eKg(col);

      if (cpu !== null) {
        bucketAcc.cpuSum += cpu;
        bucketAcc.cpuCount += 1;
      }
      if (energy !== null) {
        bucketAcc.energySum += energy;
        bucketAcc.energyCount += 1;
      }
      if (co2e !== null) {
        bucketAcc.co2eSum += co2e;
        bucketAcc.co2eCount += 1;
      }

      const serviceAcc = serviceAccumulators.get(col.service_id);
      if (serviceAcc) {
        serviceAcc.samplesCount += 1;
        if (cpu !== null) {
          serviceAcc.cpuSum += cpu;
          serviceAcc.cpuCount += 1;
        }
        if (energy !== null) {
          serviceAcc.energySum += energy;
        }
        if (co2e !== null) {
          serviceAcc.co2eSum += co2e;
        }
      }
    }

    const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);
    const series: CompareSeriesPoint[] = sortedBucketTimes.map((bucketTime) => {
      const serviceMap = buckets.get(bucketTime)!;
      const values: Record<string, CompareMetricPoint> = {};

      for (const service of orderedServices) {
        const acc = serviceMap.get(service.idServices);
        if (!acc) {
          values[service.idServices] = {
            cpu_usage: null,
            energy_kwh: null,
            co2e_kg: null,
          };
        } else {
          values[service.idServices] = {
            cpu_usage:
              acc.cpuCount > 0
                ? Number((acc.cpuSum / acc.cpuCount).toFixed(6))
                : null,
            energy_kwh:
              acc.energyCount > 0 ? Number(acc.energySum.toFixed(8)) : null,
            co2e_kg:
              acc.co2eCount > 0 ? Number(acc.co2eSum.toFixed(11)) : null,
          };
        }
      }

      return {
        timestamp: new Date(bucketTime).toISOString(),
        values,
      };
    });

    const serviceSummaries: CompareServiceSummary[] = orderedServices.map(
      (service) => {
        const acc = serviceAccumulators.get(service.idServices)!;
        return {
          service_id: service.idServices,
          external_id: service.external_id,
          name: service.nameServices,
          status: service.status,
          samples_count: acc.samplesCount,
          avg_cpu_usage:
            acc.cpuCount > 0
              ? Number((acc.cpuSum / acc.cpuCount).toFixed(6))
              : null,
          total_energy_kwh: Number(acc.energySum.toFixed(8)),
          total_co2e_kg: Number(acc.co2eSum.toFixed(11)),
        };
      },
    );

    const measured = serviceSummaries
      .filter((s) => s.samples_count > 0)
      .sort(
        (a, b) =>
          b.total_co2e_kg - a.total_co2e_kg ||
          b.total_energy_kwh - a.total_energy_kwh ||
          a.name.localeCompare(b.name),
      );

    let summary: CompareStatisticalSummary;
    if (measured.length === 0) {
      summary = {
        most_polluting_service_id: null,
        least_polluting_service_id: null,
        most_polluting_co2e_kg: null,
        least_polluting_co2e_kg: null,
        co2e_difference_kg: null,
        efficiency_difference_percent: null,
      };
    } else {
      const mostPolluting = measured[0];
      const leastPolluting = measured[measured.length - 1];
      const diffKg = Number(
        (mostPolluting.total_co2e_kg - leastPolluting.total_co2e_kg).toFixed(11),
      );
      const efficiencyPercent =
        mostPolluting.total_co2e_kg > 0
          ? Number(
              (
                ((mostPolluting.total_co2e_kg - leastPolluting.total_co2e_kg) /
                  mostPolluting.total_co2e_kg) *
                100
              ).toFixed(2),
            )
          : 0;

      summary = {
        most_polluting_service_id: mostPolluting.service_id,
        least_polluting_service_id: leastPolluting.service_id,
        most_polluting_co2e_kg: mostPolluting.total_co2e_kg,
        least_polluting_co2e_kg: leastPolluting.total_co2e_kg,
        co2e_difference_kg: diffKg,
        efficiency_difference_percent: efficiencyPercent,
      };
    }

    return {
      startDate: query.startDate ?? null,
      endDate: query.endDate ?? null,
      bucketSeconds,
      services: serviceSummaries,
      series,
      summary,
    };
  }
}
