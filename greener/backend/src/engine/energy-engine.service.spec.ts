import { describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { EnergyEngineService } from './energy-engine.service';

describe('EnergyEngineService', () => {
  let service: EnergyEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnergyEngineService],
    }).compile();

    service = module.get<EnergyEngineService>(EnergyEngineService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('deve calcular corretamente o kWh para uso de CPU em 50% e 2GB de RAM em 60s', () => {
    // CPU: 20W + (80W * 0.5) = 60W
    // RAM: 2GB * 0.375W = 0.75W
    // Total Watts = 60.75W
    // kWh em 60s = (60.75 * 60) / 3600000 = 0.0010125 kWh
    const result = service.calculatekWh({
      cpuUsagePercent: 50,
      memoryUsedMb: 2048,
      durationSeconds: 60,
    });

    expect(result).toBeCloseTo(0.0010125, 6);
  });

  it('deve calcular a linha de base (idle power) quando CPU e RAM forem zerados', () => {
    // CPU 0%: 20W (Idle Power)
    // Total Watts = 20W
    // kWh em 60s = (20 * 60) / 3600000 = 0.00033333 kWh
    const result = service.calculatekWh({
      cpuUsagePercent: 0,
      memoryUsedMb: 0,
      durationSeconds: 60,
    });

    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(0.00033333, 6);
    expect(result).toBe(0.00033333);
  });

  it('calculates the reference including disk and network rates', () => {
    const result = service.calculatekWh({
      cpuUsagePercent: 100,
      memoryUsedMb: 1024,
      diskIoMBps: 100,
      networkIoMBps: 100,
      durationSeconds: 3600,
    });

    // (100W + 0.375W + 0.1W + 0.5W) * 3600 / 3600000.
    expect(result).toBe(0.100975);
  });

  it.each([
    ['CPU below range', { cpuUsagePercent: -1 }],
    ['CPU above range', { cpuUsagePercent: 101 }],
    ['CPU NaN', { cpuUsagePercent: Number.NaN }],
    ['negative memory', { memoryUsedMb: -1 }],
    ['infinite memory', { memoryUsedMb: Number.POSITIVE_INFINITY }],
    ['negative disk', { diskIoMBps: -1 }],
    ['network NaN', { networkIoMBps: Number.NaN }],
    ['zero duration', { durationSeconds: 0 }],
    ['negative duration', { durationSeconds: -1 }],
    ['missing duration', { durationSeconds: undefined }],
  ])('rejects %s', (_caseName, override) => {
    expect(() =>
      service.calculatekWh({
        cpuUsagePercent: 50,
        memoryUsedMb: 1024,
        durationSeconds: 60,
        ...override,
      } as any),
    ).toThrow();
  });

  it('rejects energy above the persistence limit', () => {
    expect(() =>
      service.calculatekWh({
        cpuUsagePercent: 100,
        memoryUsedMb: 0,
        durationSeconds: 360_000_000,
      }),
    ).toThrow('exceeds the metric_collections.energy_kwh limit');
  });

  it('deve rejeitar métricas obrigatórias ausentes ou inválidas', () => {
    expect(() =>
      service.calculatekWh({
        cpuUsagePercent: null as any,
        memoryUsedMb: 0,
        durationSeconds: 60,
      }),
    ).toThrow('cpuUsagePercent must be a finite number.');

    expect(() =>
      service.calculatekWh({
        cpuUsagePercent: 50,
        memoryUsedMb: undefined as any,
        durationSeconds: 60,
      }),
    ).toThrow('memoryUsedMb must be a finite number.');
  });
});
