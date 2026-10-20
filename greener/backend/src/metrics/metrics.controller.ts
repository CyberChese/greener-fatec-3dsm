import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { MetricCollection } from '../entities/metric-collection.entity';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('collection-config')
  getCollectionConfig(): Promise<{
    interval_seconds: number;
    last_collection_at: Date | null;
  }> {
    return this.metricsService.getCollectionConfig();
  }
}

@Controller('services')
export class ServiceMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get(':id/history')
  getHistory(
    @Param('id', new ParseUUIDPipe()) serviceId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<MetricCollection[]> {
    return this.metricsService.findHistory(serviceId, from, to);
  }
}
