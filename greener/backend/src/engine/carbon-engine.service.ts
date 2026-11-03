import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';

export interface CarbonEmission {
  intensityGco2ePerKwh: string;
  emissionGrams: string;
  emissionKilograms: string;
}

@Injectable()
export class CarbonEngineService {
  private readonly INTENSITY_SCALE = 8;
  private readonly EMISSION_GRAMS_SCALE = 8;
  private readonly EMISSION_KILOGRAMS_SCALE = 11;
  private readonly MAX_NUMERIC_20_8_EXCLUSIVE = 1_000_000_000_000;
  private readonly MAX_NUMERIC_20_11_EXCLUSIVE = 1_000_000_000;

  constructor(
    @InjectRepository(MetricCollection)
    private readonly collectionRepository: Repository<MetricCollection>,
  ) {}

  calculateEmission(
    energyKwh: number,
    intensityGco2ePerKwh: number,
  ): CarbonEmission {
    this.assertNonNegativeFinite(energyKwh, 'energy_kwh');
    this.assertNonNegativeFinite(
      intensityGco2ePerKwh,
      'carbon_intensity_gco2e_per_kwh',
    );

    const intensityString = intensityGco2ePerKwh.toFixed(
      this.INTENSITY_SCALE,
    );
    const appliedIntensity = Number(intensityString);
    if (appliedIntensity >= this.MAX_NUMERIC_20_8_EXCLUSIVE) {
      throw new RangeError(
        'O fator de intensidade de carbono excede o limite de persistência numeric(20,8).',
      );
    }

    const unroundedEmissionGrams = energyKwh * appliedIntensity;
    if (!Number.isFinite(unroundedEmissionGrams)) {
      throw new RangeError('A emissão de CO₂e calculada está fora da faixa suportada.');
    }

    if (unroundedEmissionGrams >= this.MAX_NUMERIC_20_8_EXCLUSIVE) {
      throw new RangeError(
        'A emissão em gramas excede o limite de persistência numeric(20,8).',
      );
    }

    const emissionGrams = Number(
      unroundedEmissionGrams.toFixed(this.EMISSION_GRAMS_SCALE),
    );
    const emissionKilograms = (emissionGrams / 1000).toFixed(
      this.EMISSION_KILOGRAMS_SCALE,
    );
    if (Number(emissionKilograms) >= this.MAX_NUMERIC_20_11_EXCLUSIVE) {
      throw new RangeError(
        'A emissão em quilogramas excede o limite de persistência numeric(20,11).',
      );
    }

    return {
      intensityGco2ePerKwh: intensityString,
      emissionGrams: emissionGrams.toFixed(this.EMISSION_GRAMS_SCALE),
      emissionKilograms: emissionKilograms,
    };
  }

  async reprocessCollection(collectionId: string): Promise<MetricCollection> {
    const collection = await this.collectionRepository.findOneBy({
      idCollections: collectionId,
    });
    if (!collection) {
      throw new NotFoundException(
        `A coleta de métricas "${collectionId}" não foi encontrada.`,
      );
    }

    if (
      collection.energy_kwh === null ||
      collection.energy_kwh === undefined ||
      collection.carbon_intensity_gco2e_per_kwh === null ||
      collection.carbon_intensity_gco2e_per_kwh === undefined ||
      collection.carbon_intensity_fallback === null ||
      collection.carbon_intensity_fallback === undefined
    ) {
      throw new RangeError(
        `A coleta de métricas "${collectionId}" não possui energia ou fator de intensidade de carbono.`,
      );
    }

    const intensity = Number(collection.carbon_intensity_gco2e_per_kwh);
    const emission = this.calculateEmission(collection.energy_kwh, intensity);
    collection.carbon_intensity_gco2e_per_kwh =
      emission.intensityGco2ePerKwh;
    collection.co2e_g = emission.emissionGrams;
    collection.co2e_kg = emission.emissionKilograms;

    return this.collectionRepository.save(collection);
  }

  private assertNonNegativeFinite(value: number, name: string): void {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} deve ser um número finito e não negativo.`);
    }
  }
}
