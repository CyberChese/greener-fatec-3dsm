import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { CarbonEngineService } from './carbon-engine.service';

describe('CarbonEngineService', () => {
  const collection = {
    idCollections: 'a19b2315-99a0-4bd8-bf1f-51fcbf583c0a',
    energy_kwh: 0.5,
    carbon_intensity_gco2e_per_kwh: '400.00000000',
    carbon_intensity_fallback: false,
    co2e_g: null,
    co2e_kg: null,
  } as MetricCollection;

  const createService = () => {
    const repository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
    };
    return {
      repository,
      service: new CarbonEngineService(
        repository as unknown as Repository<MetricCollection>,
      ),
    };
  };

  it('calcula 200 g e 0,2 kg para 0,5 kWh com fator de 400 gCO₂e/kWh', () => {
    const { service } = createService();

    expect(service.calculateEmission(0.5, 400)).toEqual({
      intensityGco2ePerKwh: '400.00000000',
      emissionGrams: '200.00000000',
      emissionKilograms: '0.20000000000',
    });
  });

  it('rejeita entradas negativas ou não finitas', () => {
    const { service } = createService();

    expect(() => service.calculateEmission(-0.5, 400)).toThrow(RangeError);
    expect(() => service.calculateEmission(0.5, Number.NaN)).toThrow(
      RangeError,
    );
  });

  it('reprocessa a mesma coleta sem criar outra linha', async () => {
    const { repository, service } = createService();
    repository.findOneBy.mockResolvedValue(collection);
    repository.save.mockImplementation(async (value: MetricCollection) => value);

    const firstResult = await service.reprocessCollection(
      collection.idCollections,
    );
    const secondResult = await service.reprocessCollection(
      collection.idCollections,
    );

    expect(repository.findOneBy).toHaveBeenCalledTimes(2);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      idCollections: collection.idCollections,
    });
    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenNthCalledWith(1, collection);
    expect(repository.save).toHaveBeenNthCalledWith(2, collection);
    expect(firstResult.idCollections).toBe(collection.idCollections);
    expect(secondResult.idCollections).toBe(collection.idCollections);
    expect(secondResult.co2e_g).toBe('200.00000000');
    expect(secondResult.co2e_kg).toBe('0.20000000000');
  });

  it('informa quando a coleta não existe sem tentar salvá-la', async () => {
    const { repository, service } = createService();
    repository.findOneBy.mockResolvedValue(null);

    await expect(
      service.reprocessCollection(collection.idCollections),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
