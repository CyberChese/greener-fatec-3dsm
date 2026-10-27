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

describe('collectionsToCsv', () => {
  it('gera cabeçalho e linhas numéricas', () => {
    const csv = collectionsToCsv('Billing, API', [collection()])
    const [header, row] = csv.split('\n')
    expect(header).toBe('servico,recebida_em,cpu_percent,memoria_gb,disco_gb,rede_gb')
    expect(row).toBe('"Billing, API",2026-10-19T00:48:13.443Z,42.5,2.1,10,0.3')
  })
})
