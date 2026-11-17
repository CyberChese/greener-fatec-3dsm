import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MetricCollection } from '../entities/metric-collection.entity';
import { CollectionConfigDto, MetricsSummaryDto } from './dto/metrics-summary.dto';
import { CompareQueryDto } from './dto/compare-query.dto';
import { RankingQueryDto } from './dto/ranking-query.dto';
import {
  AnalyticsService,
  CompareResult,
  RankingResult,
} from './analytics.service';
import { MetricsService, MetricsSummary } from './metrics.service';

@Controller('metrics')
@ApiTags('Metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('ranking')
  @ApiOperation({ summary: 'Return services ranked by environmental impact' })
  @ApiResponse({ status: 200, description: 'Paginated ranking for the requested period.' })
  @ApiResponse({ status: 400, description: 'Invalid metric, order, pagination, or date filter.' })
  getRanking(@Query() query: RankingQueryDto): Promise<RankingResult> {
    return this.analyticsService.getRanking(query);
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Compare 2 to 4 services over a sampling period with temporally aligned series',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paired time series (CPU, kWh, CO2e) and statistical efficiency summary across the compared services.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid serviceIds count (must be 2 to 4 unique IDs) or date filter.',
  })
  @ApiResponse({ status: 404, description: 'One or more services were not found.' })
  compareServices(@Query() query: CompareQueryDto): Promise<CompareResult> {
    return this.analyticsService.compareServices(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Return consolidated environmental indicators' })
  @ApiResponse({ status: 200, type: MetricsSummaryDto })
  getSummary(): Promise<MetricsSummary> {
    return this.metricsService.getSummary();
  }

  @Get('collection-config')
  @ApiOperation({ summary: 'Return the metric collection configuration' })
  @ApiResponse({ status: 200, type: CollectionConfigDto })
  getCollectionConfig(): Promise<{
    interval_seconds: number;
    last_collection_at: Date | null;
  }> {
    return this.metricsService.getCollectionConfig();
  }
}

@Controller('services')
@ApiTags('Services')
export class ServiceMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get(':id/history')
  @ApiOperation({ summary: 'Return a service metric collection history' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Internal service UUID.' })
  @ApiQuery({ name: 'from', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'to', required: false, type: String, format: 'date-time' })
  @ApiResponse({ status: 200, type: MetricCollection, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid UUID or date filter.' })
  @ApiResponse({ status: 404, description: 'Service not found.' })
  getHistory(
    @Param('id', new ParseUUIDPipe()) serviceId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<MetricCollection[]> {
    return this.metricsService.findHistory(serviceId, from, to);
  }
}
