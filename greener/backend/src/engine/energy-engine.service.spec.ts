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
  });

  it('deve ser resiliente e tratar valores nulos ou faltantes aplicandos fallbacks', () => {
    const result = service.calculatekWh({
      cpuUsagePercent: null as any,
      memoryUsedMb: undefined as any,
      diskIoMBps: undefined,
      networkIoMBps: undefined,
    });

    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });
});