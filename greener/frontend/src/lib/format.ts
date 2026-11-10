const decimal = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const fmt2 = decimal(2)
const fmt1 = decimal(1)
const fmt0 = decimal(0)

const significant = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 2 })

/**
 * Energia e emissão: casas decimais fixas, mas um valor pequeno que viraria zero (ex.: 0,0004 kWh) mantém 2 algarismos
 * significativos. Assim "0,000" só aparece quando o valor é realmente zero, e a ausência de dado continua sendo "—".
 */
export const formatImpact = (value: number | null, digits = 3) => {
  if (value == null || !Number.isFinite(value)) return '—'
  if (value !== 0 && Math.abs(value) < 0.5 * 10 ** -digits) return significant.format(value)
  return decimal(digits).format(value)
}

export const formatKwh = (value: number | null) => formatImpact(value, 3)
export const formatKg = (value: number | null) => formatImpact(value, 3)
export const formatPercent = (value: number | null) => (value == null ? '—' : `${fmt1.format(value)}%`)
export const formatWatts = (value: number | null) => (value == null ? '—' : `${fmt1.format(value)} W`)
export const formatGb = (value: number | null) => (value == null ? '—' : `${fmt2.format(value)} GB`)
export const formatIntensity = (value: number | null) => (value == null ? '—' : fmt0.format(value))
export const formatNumber = (value: number, digits = 2) => decimal(digits).format(value)

const smallMeasure = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 3 })
const largeMeasure = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const shareFormat = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })
const countFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export const formatMeasure = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return '—'
  return Math.abs(value) < 1 ? smallMeasure.format(value) : largeMeasure.format(value)
}
export const formatShare = (part: number, total: number) => (total > 0 ? shareFormat.format(part / total) : '—')

export const formatCount = (value: number) => countFormat.format(value)
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
