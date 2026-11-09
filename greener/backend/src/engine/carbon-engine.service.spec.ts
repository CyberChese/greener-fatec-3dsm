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

  it('preserves documented precision and rounds intensity before calculating', () => {
    const { service } = createService();
    const energyKwh = 1.23456789;
    const intensity = 85.123456789;
    const appliedIntensity = 85.12345679;
    const expectedGrams = energyKwh * appliedIntensity;

    const result = service.calculateEmission(energyKwh, intensity);

    expect(result.intensityGco2ePerKwh).toBe('85.12345679');
    expect(Number(result.emissionGrams)).toBeCloseTo(expectedGrams, 8);
    expect(Number(result.emissionKilograms)).toBeCloseTo(
      expectedGrams / 1000,
      11,
    );
    expect(result.emissionGrams).toMatch(/^\d+\.\d{8}$/);
    expect(result.emissionKilograms).toMatch(/^\d+\.\d{11}$/);
  });

  it('calculates zero energy and intensity', () => {
    const { service } = createService();

    expect(service.calculateEmission(0, 0)).toEqual({
      intensityGco2ePerKwh: '0.00000000',
      emissionGrams: '0.00000000',
      emissionKilograms: '0.00000000000',
    });
  });

  it.each([
    ['null energy', null, 400],
    ['undefined energy', undefined, 400],
    ['infinite energy', Number.POSITIVE_INFINITY, 400],
    ['negative intensity', 0.5, -1],
    ['infinite intensity', 0.5, Number.POSITIVE_INFINITY],
  ])('rejects %s', (_caseName, energy, intensity) => {
    const { service } = createService();

    expect(() =>
      service.calculateEmission(energy as any, intensity as any),
    ).toThrow(RangeError);
  });

  it('rejects values above persistence limits', () => {
    const { service } = createService();

    expect(() => service.calculateEmission(1_000_000_000_000, 1)).toThrow(
      RangeError,
    );
    expect(() => service.calculateEmission(1, 1_000_000_000_000)).toThrow(
      RangeError,
    );
  });

  it('informa quando a coleta não existe sem tentar salvá-la', async () => {
    const { repository, service } = createService();
    repository.findOneBy.mockResolvedValue(null);

    await expect(
      service.reprocessCollection(collection.idCollections),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    ['energy', { energy_kwh: null }],
    ['carbon intensity', { carbon_intensity_gco2e_per_kwh: null }],
    ['fallback flag', { carbon_intensity_fallback: null }],
  ])('rejects reprocessing without persisted %s', async (_caseName, override) => {
    const { repository, service } = createService();
    repository.findOneBy.mockResolvedValue({ ...collection, ...override });

    await expect(
      service.reprocessCollection(collection.idCollections),
    ).rejects.toBeInstanceOf(RangeError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
