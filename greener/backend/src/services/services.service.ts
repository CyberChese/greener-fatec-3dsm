import { Injectable } from '@nestjs/common';
import { Service } from '../entities/service.entity';
import { ServiceRepository } from '../repositories/service.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  findAll(): Promise<Service[]> {
    return this.serviceRepository.findAll();
  }
}