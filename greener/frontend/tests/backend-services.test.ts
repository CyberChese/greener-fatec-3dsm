import { describe, expect, it } from 'vitest'
import { mapBackendService } from '@/services/backend-services'
import type { BackendService } from '@/services/backend-services'

const base: BackendService = {
  idServices: 'uuid-1',
  external_id: 'billing-api',
  nameServices: 'Billing API',
  status: 'ACTIVE',
  country: 'Brazil',
  region: 'Sudeste',
  city: 'São Paulo',
  latitude: '-23.550500',
  longitude: '-46.633300',
  last_observed_at: null,
}

describe('mapBackendService', () => {
  it('converte estado, coordenadas (texto → número) e identificador', () => {
    const s = mapBackendService(base)
    expect(s.id).toBe('billing-api')
    expect(s.name).toBe('Billing API')
    expect(s.status).toBe('active')
    expect(s.location.latitude).toBeCloseTo(-23.5505, 6)
    expect(s.location.longitude).toBeCloseTo(-46.6333, 6)
  })

  it('mapeia os três estados do backend', () => {
    expect(mapBackendService({ ...base, status: 'UNAVAILABLE' }).status).toBe('unavailable')
    expect(mapBackendService({ ...base, status: 'NO_METRICS' }).status).toBe('no_metrics')
  })

  it('estado desconhecido vira "sem métricas" (nunca "ativo")', () => {
    expect(mapBackendService({ ...base, status: 'REMOVED' }).status).toBe('no_metrics')
  })

  it('coordenadas ausentes ficam nulas e valores de consumo ficam nulos (nunca zero)', () => {
    const s = mapBackendService({ ...base, latitude: null, longitude: '' })
    expect(s.location.latitude).toBeNull()
    expect(s.location.longitude).toBeNull()
    expect(s.energyKwh).toBeNull()
    expect(s.co2eKg).toBeNull()
    expect(s.intensity).toBeNull()
  })

  it('usa o id interno se o external_id estiver vazio', () => {
    expect(mapBackendService({ ...base, external_id: '' }).id).toBe('uuid-1')
  })
})

// ---- histórico real (GET /api/services/:id/history) ----
import {
  attachLatestMetrics,
  mapCollectionToMetrics,
  METRICS_TTL_MS,
  summarizeImpact,
  type BackendCollection,
  type LatestMetricsCache,
} from '@/services/backend-services'
import { collectionsToCsv } from '@/lib/csv'

const collection = (overrides: Partial<BackendCollection> = {}): BackendCollection => ({
  idCollections: 'c1',
  service_id: 'uuid-1',
  cpu_usage: '42.500000',
  memory_usage: '2.100000',
  storage_usage: '10.000000',
  network_io: '0.300000',
  timestamp: '2026-10-19T00:48:13.443Z',
  ...overrides,
})

describe('mapCollectionToMetrics', () => {
  it('converte texto em número, nas unidades do backend (%, GB)', () => {
    expect(mapCollectionToMetrics(collection())).toEqual({ cpu_percent: 42.5, memory_gb: 2.1, disk_gb: 10, network_gb: 0.3 })
  })

  it('devolve null (nunca zero) se qualquer valor faltar', () => {
    expect(mapCollectionToMetrics(collection({ memory_usage: null }))).toBeNull()
    expect(mapCollectionToMetrics(collection({ network_io: '' }))).toBeNull()
  })
})

describe('attachLatestMetrics', () => {
  const active = () => ({ ...mapBackendService(base), backendId: 'uuid-1' })
  const NOW = Date.parse('2026-10-19T01:00:00Z')

  it('usa a coleta mais recente e pede só a janela recente', async () => {
    const calls: unknown[] = []
    const fetchHistory = async (id: string, range?: { from?: string }) => {
      calls.push([id, range?.from])
      return [
        collection({ idCollections: 'old', cpu_usage: '10', timestamp: '2026-10-19T00:50:00Z' }),
        collection({ idCollections: 'new', cpu_usage: '77', timestamp: '2026-10-19T00:59:30Z' }),
      ]
    }
    const [s] = await attachLatestMetrics([active()], new Map(), { now: NOW, fetchHistory })
    expect(s.metrics?.cpu_percent).toBe(77)
    expect(s.metricsAt).toBe('2026-10-19T00:59:30Z')
    expect(s.errorMessage).toBeNull()
    expect(calls).toEqual([['uuid-1', '2026-10-19T00:45:00.000Z']])
  })

  it('não consulta de novo dentro do TTL e consulta depois dele', async () => {
    let count = 0
    const fetchHistory = async () => (count++, [collection()])
    const cache: LatestMetricsCache = new Map()
    await attachLatestMetrics([active()], cache, { now: NOW, fetchHistory })
    await attachLatestMetrics([active()], cache, { now: NOW + METRICS_TTL_MS - 1, fetchHistory })
    expect(count).toBe(1)
    await attachLatestMetrics([active()], cache, { now: NOW + METRICS_TTL_MS, fetchHistory })
    expect(count).toBe(2)
  })

  it('só consulta serviços ativos', async () => {
    let count = 0
    const fetchHistory = async () => (count++, [collection()])
    const down = { ...mapBackendService({ ...base, status: 'UNAVAILABLE' }), backendId: 'uuid-1' }
    const [s] = await attachLatestMetrics([down], new Map(), { now: NOW, fetchHistory })
    expect(count).toBe(0)
    expect(s.metrics).toBeNull()
  })

  it('se a consulta falhar, mantém a última leitura; sem leitura, fica nulo', async () => {
    const failing = async () => {
      throw new Error('rede')
    }
    const [none] = await attachLatestMetrics([active()], new Map(), { now: NOW, fetchHistory: failing })
    expect(none.metrics).toBeNull()
    expect(none.errorMessage).toContain('Não foi possível ler')

    const cache: LatestMetricsCache = new Map()
    await attachLatestMetrics([active()], cache, { now: NOW, fetchHistory: async () => [collection({ cpu_usage: '55' })] })
    const [stale] = await attachLatestMetrics([active()], cache, { now: NOW + METRICS_TTL_MS, fetchHistory: failing })
    expect(stale.metrics?.cpu_percent).toBe(55)
    expect(stale.errorMessage).toContain('desatualizadas')
  })

  it('sem coletas na janela: métricas nulas e aviso', async () => {
    const [s] = await attachLatestMetrics([active()], new Map(), { now: NOW, fetchHistory: async () => [] })
    expect(s.metrics).toBeNull()
    expect(s.errorMessage).toContain('15 minutos')
  })
})

describe('summarizeImpact', () => {
  const withImpact = (overrides: Partial<BackendCollection> = {}) =>
    collection({
      energy_kwh: 0.0004,
      carbon_intensity_gco2e_per_kwh: '400.00000000',
      co2e_g: '0.16000000',
      co2e_kg: '0.00016000000',
      carbon_intensity_fallback: false,
      ...overrides,
    })

  it('soma energia e CO2e das coletas da janela (texto → número)', () => {
    const impact = summarizeImpact([
      withImpact({ idCollections: 'a', timestamp: '2026-10-19T00:50:00Z' }),
      withImpact({ idCollections: 'b', energy_kwh: '0.0006', co2e_kg: '0.00024000000', timestamp: '2026-10-19T00:50:30Z' }),
    ])
    expect(impact.energyKwh).toBeCloseTo(0.001, 8)
    expect(impact.co2eKg).toBeCloseTo(0.0004, 8)
    expect(impact.samples).toBe(2)
  })

  it('usa a intensidade e o aviso de valor padrão da coleta mais recente', () => {
    const impact = summarizeImpact([
      withImpact({ carbon_intensity_gco2e_per_kwh: '100', carbon_intensity_fallback: false, timestamp: '2026-10-19T00:50:00Z' }),
      withImpact({ carbon_intensity_gco2e_per_kwh: '250', carbon_intensity_fallback: true, timestamp: '2026-10-19T00:59:00Z' }),
    ])
    expect(impact.intensity).toBe(250)
    expect(impact.intensityFallback).toBe(true)
  })

  it('sem nenhum valor (coletas antigas ou campos ausentes) devolve null, nunca zero', () => {
    const impact = summarizeImpact([collection(), collection({ energy_kwh: null, co2e_kg: null })])
    expect(impact).toEqual({ energyKwh: null, co2eKg: null, intensity: null, intensityFallback: null, samples: 0 })
  })

  it('ignora coletas sem o valor em vez de tratá-las como zero', () => {
    const impact = summarizeImpact([collection({ energy_kwh: null }), withImpact({ energy_kwh: 0.002 })])
    expect(impact.energyKwh).toBeCloseTo(0.002, 8)
    expect(impact.samples).toBe(1)
  })

  it('calcula o CO2e a partir dos gramas quando co2e_kg não vier', () => {
    const impact = summarizeImpact([withImpact({ co2e_kg: null, co2e_g: '250' })])
    expect(impact.co2eKg).toBeCloseTo(0.25, 8)
  })

  it('ignora valores não numéricos', () => {
    expect(summarizeImpact([withImpact({ energy_kwh: 'abc', co2e_kg: '' })]).energyKwh).toBeNull()
  })
})

describe('attachLatestMetrics: energia e CO2e por serviço', () => {
  const active = () => ({ ...mapBackendService(base), backendId: 'uuid-1' })
  const NOW = Date.parse('2026-10-19T01:00:00Z')
  const rows = [
    collection({ idCollections: 'a', timestamp: '2026-10-19T00:50:00Z', energy_kwh: 0.001, co2e_kg: '0.0004', carbon_intensity_gco2e_per_kwh: '400', carbon_intensity_fallback: false }),
    collection({ idCollections: 'b', timestamp: '2026-10-19T00:59:30Z', energy_kwh: 0.002, co2e_kg: '0.0008', carbon_intensity_gco2e_per_kwh: '400', carbon_intensity_fallback: false }),
  ]

  it('preenche energia, CO2e e intensidade somando a janela', async () => {
    const [s] = await attachLatestMetrics([active()], new Map(), { now: NOW, fetchHistory: async () => rows })
    expect(s.energyKwh).toBeCloseTo(0.003, 8)
    expect(s.co2eKg).toBeCloseTo(0.0012, 8)
    expect(s.intensity).toBe(400)
    expect(s.intensityFallback).toBe(false)
  })

  it('histórico sem energia deixa os valores nulos ("—")', async () => {
    const [s] = await attachLatestMetrics([active()], new Map(), { now: NOW, fetchHistory: async () => [collection()] })
    expect(s.energyKwh).toBeNull()
    expect(s.co2eKg).toBeNull()
    expect(s.intensity).toBeNull()
  })

  it('serviço que não está ativo não recebe energia nem CO2e', async () => {
    const down = { ...mapBackendService({ ...base, status: 'UNAVAILABLE' }), backendId: 'uuid-1' }
    const [s] = await attachLatestMetrics([down], new Map(), { now: NOW, fetchHistory: async () => rows })
    expect(s.energyKwh).toBeNull()
    expect(s.co2eKg).toBeNull()
  })

  it('se a consulta seguinte falhar, mantém os valores da última leitura', async () => {
    const cache: LatestMetricsCache = new Map()
    await attachLatestMetrics([active()], cache, { now: NOW, fetchHistory: async () => rows })
    const failing = async () => {
      throw new Error('rede')
    }
    const [s] = await attachLatestMetrics([active()], cache, { now: NOW + METRICS_TTL_MS, fetchHistory: failing })
    expect(s.energyKwh).toBeCloseTo(0.003, 8)
    expect(s.errorMessage).toContain('desatualizadas')
  })
})

describe('collectionsToCsv', () => {
  it('gera cabeçalho e linhas numéricas', () => {
    const csv = collectionsToCsv('Billing, API', [collection()])
    const [header, row] = csv.split('\n')
    expect(header).toBe('servico,recebida_em,cpu_percent,memoria_gb,disco_gb,rede_gb')
    expect(row).toBe('"Billing, API",2026-10-19T00:48:13.443Z,42.5,2.1,10,0.3')
  })
})
