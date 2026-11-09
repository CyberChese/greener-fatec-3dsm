import type { CollectionRecord, Metrics, ServiceSnapshot } from '@/lib/types'

export const metrics = (overrides: Partial<Metrics> = {}): Metrics => ({
  cpu_percent: 50,
  memory_gb: 8,
  disk_gb: 40,
  network_gb: 1,
  ...overrides,
})

export const snapshot = (overrides: Partial<ServiceSnapshot> = {}): ServiceSnapshot => ({
  id: 'svc',
  name: 'Svc',
  location: { region_code: 'br-sudeste', country: 'Brazil', region: 'Sudeste', city: null, latitude: null, longitude: null },
  status: 'active',
  metrics: null,
  intensity: null,
  renewableShare: null,
  powerWatts: null,
  energyKwh: null,
  co2eKg: null,
  errorMessage: null,
  ...overrides,
})

export const record = (overrides: Partial<CollectionRecord> = {}): CollectionRecord => ({
  id: '1-svc',
  tick: 1,
  collectedAt: '2026-10-10T12:00:00.000Z',
  simulatedAt: '2026-10-10T12:00:00.000Z',
  serviceId: 'svc',
  serviceName: 'Svc',
  regionCode: 'br-sudeste',
  status: 'active',
  cpuPercent: 50,
  memoryGb: 8,
  energyKwh: 1,
  co2eKg: 0.085,
  ...overrides,
})
