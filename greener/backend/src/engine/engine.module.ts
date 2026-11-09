import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { CarbonEngineService } from './carbon-engine.service';
import { EnergyEngineService } from './energy-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([MetricCollection])],
  providers: [EnergyEngineService, CarbonEngineService],
  exports: [EnergyEngineService, CarbonEngineService],
})
export class EngineModule {}
