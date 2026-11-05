import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Service } from '../entities/service.entity';
import { ServicesService } from './services.service';

@Controller('services')
@ApiTags('Services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all discovered services' })
  @ApiResponse({ status: 200, type: Service, isArray: true })
  async findAll(): Promise<Service[]> {
    return this.servicesService.findAll();
  }
}
