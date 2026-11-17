import { describe, expect, it } from 'vitest'
import {
  buildComparisonPoints,
  MAX_COMPARED_SERVICES,
  summarizeBackendImpactComparison,
  summarizeImpactComparison,
  toggleComparisonSelection,
} from '@/components/dashboard/comparison-data'
import { record, snapshot } from './fixtures'
import type { BackendComparisonResult } from '@/services/backend-services'

const services = [
  snapshot({ id: 'alpha', name: 'Alpha', backendId: 'internal-alpha' }),
  snapshot({ id: 'beta', name: 'Beta', backendId: 'internal-beta' }),
]

describe('dados dos gráficos comparativos (TASK-044)', () => {
  it('alinha coletas simuladas por instante e preserva valores ausentes como null', () => {
    const points = buildComparisonPoints(
      services,
      [
        record({ serviceId: 'alpha', simulatedAt: '2026-10-10T12:00:00.000Z', energyKwh: 0.002, co2eKg: 0.0002 }),
        record({ serviceId: 'beta', simulatedAt: '2026-10-10T12:00:00.000Z', energyKwh: null, co2eKg: 0.0004 }),
        record({ serviceId: 'unselected', simulatedAt: '2026-10-10T12:00:00.000Z' }),
      ],
      [],
    )

    expect(points).toHaveLength(1)
    expect(points[0].values).toEqual({
      alpha: { energyKwh: 0.002, co2eKg: 0.0002 },
      beta: { energyKwh: null, co2eKg: 0.0004 },
    })
  })

  it('converte valores do histórico real e usa gramas quando kg não estão disponíveis', () => {
    const points = buildComparisonPoints(
      services,
      [],
      [{
        timestamp: '2026-10-10T12:00:00.000Z',
        values: {
          'internal-alpha': { cpu_usage: null, energy_kwh: 0.0025, co2e_kg: 0.125 },
          'internal-beta': { cpu_usage: null, energy_kwh: null, co2e_kg: null },
        },
      }],
    )

    expect(points).toHaveLength(1)
    expect(points[0].values.alpha).toEqual({ energyKwh: 0.0025, co2eKg: 0.125 })
    expect(points[0].values.beta).toBeUndefined()
  })

  it('calcula economia pelas emissões observadas e ignora serviços sem medição', () => {
    const points = buildComparisonPoints(
      services,
      [
        record({ serviceId: 'alpha', energyKwh: 0.002, co2eKg: 0.0002, simulatedAt: '2026-10-10T12:00:00.000Z' }),
        record({ serviceId: 'beta', energyKwh: 0.008, co2eKg: 0.0008, simulatedAt: '2026-10-10T12:00:00.000Z' }),
        record({ serviceId: 'alpha', energyKwh: 0.002, co2eKg: 0.0002, simulatedAt: '2026-10-10T12:00:15.000Z' }),
      ],
      [],
    )

    const summary = summarizeImpactComparison(services, points)
    expect(summary?.mostEfficient.name).toBe('Alpha')
    expect(summary?.leastEfficient.name).toBe('Beta')
    expect(summary?.savingsPercent).toBe(50)
    expect(summary?.mostEfficientSamples).toBe(2)
    expect(summary?.leastEfficientSamples).toBe(1)
  })

  it('não calcula economia com menos de dois serviços medidos e mantém o limite de seleção', () => {
    const points = buildComparisonPoints(
      services,
      [record({ serviceId: 'alpha', energyKwh: 0.002 })],
      [],
    )

    expect(summarizeImpactComparison(services, points)).toBeNull()
    expect(MAX_COMPARED_SERVICES).toBe(4)
    expect(toggleComparisonSelection(['a', 'b', 'c', 'd'], 'e')).toEqual(['a', 'b', 'c', 'd'])
    expect(toggleComparisonSelection(['a', 'b', 'c', 'd'], 'c')).toEqual(['a', 'b', 'd'])
  })

  it('usa os identificadores e a economia percentual já calculados pelo endpoint real', () => {
    const result: BackendComparisonResult = {
      startDate: null,
      endDate: null,
      bucketSeconds: 30,
      services: [
        {
          service_id: 'internal-alpha',
          external_id: 'alpha',
          name: 'Alpha',
          status: 'ACTIVE',
          samples_count: 2,
          avg_cpu_usage: null,
          total_energy_kwh: 0.002,
          total_co2e_kg: 0.0002,
        },
        {
          service_id: 'internal-beta',
          external_id: 'beta',
          name: 'Beta',
          status: 'ACTIVE',
          samples_count: 2,
          avg_cpu_usage: null,
          total_energy_kwh: 0.004,
          total_co2e_kg: 0.0004,
        },
      ],
      series: [
        {
          timestamp: '2026-10-10T12:00:00.000Z',
          values: {
            'internal-alpha': { cpu_usage: null, energy_kwh: 0.001, co2e_kg: 0.0001 },
            'internal-beta': { cpu_usage: null, energy_kwh: 0.002, co2e_kg: 0.0002 },
          },
        },
      ],
      summary: {
        most_polluting_service_id: 'internal-beta',
        least_polluting_service_id: 'internal-alpha',
        most_polluting_co2e_kg: 0.0004,
        least_polluting_co2e_kg: 0.0002,
        co2e_difference_kg: 0.0002,
        efficiency_difference_percent: 50,
      },
    }

    const summary = summarizeBackendImpactComparison(services, result)
    expect(summary?.mostEfficient.name).toBe('Alpha')
    expect(summary?.leastEfficient.name).toBe('Beta')
    expect(summary?.savingsPercent).toBe(50)
    expect(summarizeBackendImpactComparison(services, { ...result, series: [] })).toBeNull()
  })
})
