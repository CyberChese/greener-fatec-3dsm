import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServiceEntity } from './entities/service.entity';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // POST /services - Cadastrar novo serviço
  @Post()
  async create(@Body() body: { name: string; description?: string }): Promise<ServiceEntity> {
    return await this.servicesService.create(body);
  }

  // GET /services - Listar todos os serviços
  @Get()
  async findAll(): Promise<ServiceEntity[]> {
    return await this.servicesService.findAll();
  }

  // GET /services/:id - Buscar serviço por ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ServiceEntity> {
    return await this.servicesService.findOne(id);
  }

  // PATCH /services/:id - Atualizar serviço
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<ServiceEntity>,
  ): Promise<ServiceEntity> {
    return await this.servicesService.update(id, body);
  }

  // DELETE /services/:id - Remover serviço
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.servicesService.remove(id);
    return { message: 'Serviço removido com sucesso.' };
  }
}
