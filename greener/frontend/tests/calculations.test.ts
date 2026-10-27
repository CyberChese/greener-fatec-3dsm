import { describe, expect, it } from 'vitest'
import {
  aggregateSnapshots,
  classifyStatus,
  estimateCo2eKg,
  estimateEnergyKwh,
  estimatePowerWatts,
  haversineKm,
  hasCompleteMetrics,
  totalsByService,
} from '@/lib/calculations'
import { metrics, record, snapshot } from './fixtures'

describe('estimativas de potência, energia e CO₂e', () => {
  it('potência = CPU%/100×100 + 0,375×RAM + 0,01×disco + 0,02×rede', () => {
    // 50 + 3 + 0,4 + 0,02
    expect(estimatePowerWatts(metrics())).toBeCloseTo(53.42, 6)
  })

  it('energia de uma coleta (0,25 h) = W × h ÷ 1000', () => {
    expect(estimateEnergyKwh(metrics())).toBeCloseTo(0.013355, 6)
  })

  it('energia respeita o número de horas informado', () => {
    expect(estimateEnergyKwh(metrics(), 1)).toBeCloseTo(0.05342, 6)
  })

  it('CO₂e = kWh × g/kWh ÷ 1000', () => {
    expect(estimateCo2eKg(2, 85)).toBeCloseTo(0.17, 6)
  })

  it('intensidade zero resulta em emissão zero', () => {
    expect(estimateCo2eKg(5, 0)).toBe(0)
  })
})

describe('classificação do estado do serviço', () => {
  it('falha na requisição → indisponível, mesmo com métricas', () => {
    expect(classifyStatus(true, metrics())).toBe('unavailable')
  })

  it('resposta sem métricas → sem métricas', () => {
    expect(classifyStatus(false, null)).toBe('no_metrics')
    expect(classifyStatus(false, undefined)).toBe('no_metrics')
  })

  it('métricas incompletas ou inválidas → sem métricas', () => {
    expect(classifyStatus(false, metrics({ cpu_percent: Number.NaN }))).toBe('no_metrics')
    expect(classifyStatus(false, metrics({ disk_gb: Number.POSITIVE_INFINITY }))).toBe('no_metrics')
  })

  it('métricas completas → ativo', () => {
    expect(classifyStatus(false, metrics())).toBe('active')
  })

  it('hasCompleteMetrics rejeita ausência de dados', () => {
    expect(hasCompleteMetrics(null)).toBe(false)
    expect(hasCompleteMetrics(undefined)).toBe(false)
    expect(hasCompleteMetrics(metrics())).toBe(true)
  })
})

describe('indicadores agregados', () => {
  it('soma energia e emissão e conta cada estado', () => {
    const result = aggregateSnapshots([
      snapshot({ id: 'a', status: 'active', energyKwh: 1, co2eKg: 0.5 }),
      snapshot({ id: 'b', status: 'unavailable' }),
      snapshot({ id: 'c', status: 'no_metrics' }),
    ])
    expect(result.totalEnergyKwh).toBe(1)
    expect(result.totalCo2eKg).toBe(0.5)
    expect(result.avgIntensity).toBe(500)
    expect([result.active, result.unavailable, result.noMetrics, result.total]).toEqual([1, 1, 1, 3])
  })

  it('sem energia medida, a intensidade média é nula (e não zero)', () => {
    const result = aggregateSnapshots([snapshot({ status: 'unavailable' })])
    expect(result.avgIntensity).toBeNull()
    expect(aggregateSnapshots([]).total).toBe(0)
  })
})

describe('totais por serviço no período', () => {
  const history = [
    record({ tick: 1, energyKwh: 1, co2eKg: 0.1 }),
    record({ tick: 2, energyKwh: 2, co2eKg: 0.2 }),
    record({ tick: 3, status: 'unavailable', energyKwh: null, co2eKg: null }),
  ]

  it('considera só coletas a partir do tick informado', () => {
    const totals = totalsByService(history, 2).get('svc')
    expect(totals?.energyKwh).toBe(2)
    expect(totals?.co2eKg).toBeCloseTo(0.2, 6)
  })

  it('trata valores ausentes como zero e conta apenas amostras ativas', () => {
    const totals = totalsByService(history, 1).get('svc')
    expect(totals?.energyKwh).toBe(3)
    expect(totals?.samples).toBe(2)
  })
})

describe('distância entre coordenadas', () => {
  it('é zero para o mesmo ponto', () => {
    expect(haversineKm(-23.55, -46.63, -23.55, -46.63)).toBeCloseTo(0, 6)
  })

  it('meia volta ao longo do equador ≈ 20.015 km', () => {
    expect(haversineKm(0, 0, 0, 180)).toBeCloseTo(20015.09, 1)
  })
})
