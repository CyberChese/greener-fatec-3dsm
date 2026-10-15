import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service } from '../entities/service.entity';
import { MetricsController, ServiceMetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Service, MetricCollection])],
  controllers: [MetricsController, ServiceMetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
