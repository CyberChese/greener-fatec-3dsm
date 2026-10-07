import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceEntity } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
  ) {}

  // Criar um novo serviço
  async create(data: { name: string; description?: string }): Promise<ServiceEntity> {
    const service = this.serviceRepository.create(data);
    return await this.serviceRepository.save(service);
  }

  // Listar todos os serviços
  async findAll(): Promise<ServiceEntity[]> {
    return await this.serviceRepository.find();
  }

  // Buscar um serviço por ID
  async findOne(id: string): Promise<ServiceEntity> {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException(`Serviço com ID "${id}" não encontrado.`);
    }
    return service;
  }

  // Atualizar dados de um serviço
  async update(id: string, updateData: Partial<ServiceEntity>): Promise<ServiceEntity> {
    const service = await this.findOne(id);
    Object.assign(service, updateData);
    return await this.serviceRepository.save(service);
  }

  // Remover um serviço
  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    await this.serviceRepository.remove(service);
  }
}
