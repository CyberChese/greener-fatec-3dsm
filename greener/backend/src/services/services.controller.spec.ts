import { jest } from '@jest/globals';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service, ServiceStatus } from '../entities/service.entity';
import { ServiceRepository } from '../repositories/service.repository';

describe('ServicesService & ServicesController', () => {
  const sampleServices: Service[] = [
    {
      idServices: '11111111-1111-4111-8111-111111111111',
      external_id: 'billing-api',
      nameServices: 'Billing API',
      endpoint: '/metrics/billing-api',
      region_code: 'br-sudeste',
      status: ServiceStatus.ACTIVE,
      country: 'Brazil',
      region: 'Southeast',
      city: 'Sao Paulo',
      latitude: '-23.550500',
      longitude: '-46.633300',
      create_at: new Date('2026-11-01T00:00:00.000Z'),
      last_observed_at: new Date('2026-11-16T12:00:00.000Z'),
    },
  ];

  it('ServicesService delegates findAll to ServiceRepository', async () => {
    const findAll = jest
      .fn<() => Promise<Service[]>>()
      .mockResolvedValue(sampleServices);
    const service = new ServicesService({
      findAll,
    } as unknown as ServiceRepository);

    const result = await service.findAll();

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleServices);
  });

  it('ServicesController returns discovered services from ServicesService', async () => {
    const findAll = jest
      .fn<() => Promise<Service[]>>()
      .mockResolvedValue(sampleServices);
    const controller = new ServicesController({
      findAll,
    } as unknown as ServicesService);

    const result = await controller.findAll();

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleServices);
  });
});
