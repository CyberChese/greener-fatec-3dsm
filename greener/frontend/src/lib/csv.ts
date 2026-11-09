import type { BackendCollection } from '@/services/backend-services'
import type { CollectionRecord } from './types'

const HEADER = [
  'coleta',
  'horario_simulado',
  'recebida_em',
  'servico_id',
  'servico',
  'regiao',
  'estado',
  'cpu_percent',
  'memoria_gb',
  'energia_kwh',
  'co2e_kg',
] as const

function cell(value: string | number | null): string {
  if (value === null) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Converte registros do histórico em CSV (vírgula como separador, ponto como separador decimal). */
export function recordsToCsv(records: CollectionRecord[]): string {
  const lines: string[] = [HEADER.join(',')]
  for (const r of records) {
    lines.push(
      [
        r.tick,
        r.simulatedAt,
        r.collectedAt,
        r.serviceId,
        r.serviceName,
        r.regionCode,
        r.status,
        r.cpuPercent,
        r.memoryGb,
        r.energyKwh,
        r.co2eKg,
      ]
        .map(cell)
        .join(','),
    )
  }
  return lines.join('\n')
}

const num = (value: string | number | null) => (value === null || value === '' ? null : Number(value))

/** CSV do histórico real de um serviço (GET /services/:id/history). */
export function collectionsToCsv(serviceName: string, records: BackendCollection[]): string {
  const lines = [['servico', 'recebida_em', 'cpu_percent', 'memoria_gb', 'disco_gb', 'rede_gb'].join(',')]
  for (const r of records) {
    lines.push(
      [serviceName, r.timestamp, num(r.cpu_usage), num(r.memory_usage), num(r.storage_usage), num(r.network_io)]
        .map(cell)
        .join(','),
    )
  }
  return lines.join('\n')
}
