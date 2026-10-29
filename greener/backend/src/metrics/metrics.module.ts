import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service } from '../entities/service.entity';
import { AggregatorModule } from '../modules/aggregator/aggregator.module';
import { MetricsController, ServiceMetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { EngineModule } from '../engine/engine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, MetricCollection]),
    AggregatorModule,
    EngineModule,
  ],
  controllers: [MetricsController, ServiceMetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
