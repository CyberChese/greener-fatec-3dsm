import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { AggregatorClientService } from './aggregator-client.service';
import { ServiceDiscoveryService } from './service-discovery.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    RepositoriesModule,
  ],
  providers: [AggregatorClientService, ServiceDiscoveryService],
  exports: [AggregatorClientService, ServiceDiscoveryService],
})
export class AggregatorModule {}