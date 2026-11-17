import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { CarbonEngineService } from './carbon-engine.service';
import { EnergyEngineService } from './energy-engine.service';

@Module({
  imports: [RepositoriesModule],
  providers: [EnergyEngineService, CarbonEngineService],
  exports: [EnergyEngineService, CarbonEngineService],
})
export class EngineModule {}
