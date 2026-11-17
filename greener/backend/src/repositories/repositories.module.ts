import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service } from '../entities/service.entity';
import { User } from '../entities/user.entity';
import { MetricCollectionRepository } from './metric-collection.repository';
import { ServiceRepository } from './service.repository';
import { UserRepository } from './user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Service, MetricCollection, User])],
  providers: [ServiceRepository, MetricCollectionRepository, UserRepository],
  exports: [ServiceRepository, MetricCollectionRepository, UserRepository],
})
export class RepositoriesModule {}
