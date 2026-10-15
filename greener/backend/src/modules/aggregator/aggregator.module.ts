import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../../entities/service.entity';
import { AggregatorClientService } from './aggregator-client.service';
import { ServiceDiscoveryService } from './service-discovery.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([Service]),
  ],
  providers: [AggregatorClientService, ServiceDiscoveryService],
  exports: [AggregatorClientService, ServiceDiscoveryService],
})
export class AggregatorModule {}