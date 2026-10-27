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
