import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AggregatorClientService } from './aggregator-client.service';

@Module({
    imports: [HttpModule, ConfigModule],
    providers: [AggregatorClientService],
    exports: [AggregatorClientService],
})
export class AggregatorModule { }