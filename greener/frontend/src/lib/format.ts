const decimal = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const fmt2 = decimal(2)
const fmt3 = decimal(3)
const fmt1 = decimal(1)
const fmt0 = decimal(0)

export const formatKwh = (value: number | null) => (value == null ? '—' : fmt3.format(value))
export const formatKg = (value: number | null) => (value == null ? '—' : fmt3.format(value))
export const formatPercent = (value: number | null) => (value == null ? '—' : `${fmt1.format(value)}%`)
export const formatWatts = (value: number | null) => (value == null ? '—' : `${fmt1.format(value)} W`)
export const formatGb = (value: number | null) => (value == null ? '—' : `${fmt2.format(value)} GB`)
export const formatIntensity = (value: number | null) => (value == null ? '—' : fmt0.format(value))
export const formatNumber = (value: number, digits = 2) => decimal(digits).format(value)

export const formatTime = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export const formatDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

export const formatSimulatedClock = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function formatLocation(city: string | null, region: string, country: string) {
  return [city, region, country].filter(Boolean).join(' · ')
}
