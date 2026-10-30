import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CarbonIntensityClientService } from './carbon-intensity-client.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [CarbonIntensityClientService],
  exports: [CarbonIntensityClientService],
})
export class CarbonIntensityModule {}
