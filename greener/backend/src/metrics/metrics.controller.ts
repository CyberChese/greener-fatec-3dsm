import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { MetricCollection } from '../entities/metric-collection.entity';
import {
  CollectionConfigDto,
  MetricsSummaryDto,
} from './dto/metrics-summary.dto';
import { CompareQueryDto } from './dto/compare-query.dto';
import { RankingQueryDto } from './dto/ranking-query.dto';
import {
  CompareMetricPointDto,
  CompareResponseDto,
  CompareSeriesPointDto,
  CompareServiceSummaryDto,
  CompareStatisticalSummaryDto,
  RankingItemDto,
  RankingPaginationDto,
  RankingResponseDto,
} from './dto/analytics-response.dto';
import {
  AnalyticsService,
  CompareResult,
  RankingResult,
} from './analytics.service';
import { MetricsService, MetricsSummary } from './metrics.service';

@Controller('metrics')
@ApiTags('Metrics')
@ApiExtraModels(
  CompareMetricPointDto,
  CompareResponseDto,
  CompareSeriesPointDto,
  CompareServiceSummaryDto,
  CompareStatisticalSummaryDto,
  RankingItemDto,
  RankingPaginationDto,
  RankingResponseDto,
)
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('ranking')
  @ApiOperation({ summary: 'Return services ranked by environmental impact' })
  @ApiResponse({
    status: 200,
    description: 'Paginated ranking for the requested period.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(RankingResponseDto) },
        example: {
          metric: 'co2e',
          order: 'desc',
          startDate: '2026-11-16T12:00:00.000Z',
          endDate: '2026-11-16T13:00:00.000Z',
          items: [
            {
              rank: 1,
              service_id: 'b9a3f744-1f9b-4e53-8b11-31d112a49c83',
              external_id: 'billing-api',
              name: 'Billing API',
              status: 'ACTIVE',
              metric_value: 0.04692212,
            },
          ],
          pagination: { page: 1, limit: 10, total: 24, totalPages: 3 },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid metric, order, pagination, or date filter.',
  })
  getRanking(@Query() query: RankingQueryDto): Promise<RankingResult> {
    return this.analyticsService.getRanking(query);
  }

  @Get('compare')
  @ApiOperation({
    summary:
      'Compare 2 to 4 services over a sampling period with temporally aligned series',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paired time series (CPU, kWh, CO2e) and statistical efficiency summary across the compared services.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CompareResponseDto) },
        example: {
          startDate: '2026-11-16T12:00:00.000Z',
          endDate: '2026-11-16T12:01:00.000Z',
          bucketSeconds: 30,
          services: [
            {
              service_id: 'b9a3f744-1f9b-4e53-8b11-31d112a49c83',
              external_id: 'billing-api',
              name: 'Billing API',
              status: 'ACTIVE',
              samples_count: 2,
              avg_cpu_usage: 70,
              total_energy_kwh: 0.0014,
              total_co2e_kg: 0.0007,
            },
          ],
          series: [
            {
              timestamp: '2026-11-16T12:00:00.000Z',
              values: {
                'b9a3f744-1f9b-4e53-8b11-31d112a49c83': {
                  cpu_usage: 80,
                  energy_kwh: 0.0008,
                  co2e_kg: 0.0004,
                },
              },
            },
          ],
          summary: {
            most_polluting_service_id: 'b9a3f744-1f9b-4e53-8b11-31d112a49c83',
            least_polluting_service_id: '6ea75d35-683d-45ed-8126-0d83bc3a89ca',
            most_polluting_co2e_kg: 0.0007,
            least_polluting_co2e_kg: 0.00028,
            co2e_difference_kg: 0.00042,
            efficiency_difference_percent: 60,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid serviceIds count (must be 2 to 4 unique IDs) or date filter.',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more services were not found.',
  })
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
  @ApiParam({
    name: 'id',
    format: 'uuid',
    description: 'Internal service UUID.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    format: 'date-time',
  })
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
