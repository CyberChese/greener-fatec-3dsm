import { describe, expect, it } from 'vitest'
import { formatGb, formatIntensity, formatKg, formatKwh, formatLocation, formatNumber, formatPercent } from '@/lib/format'

describe('formatação em pt-BR', () => {
  it('valores ausentes viram traço, nunca zero', () => {
    for (const text of [formatKwh(null), formatKg(null), formatPercent(null), formatGb(null), formatIntensity(null)]) {
      expect(text).toBe('—')
    }
  })

  it('usa vírgula decimal e as unidades esperadas', () => {
    expect(formatKwh(1.23456)).toBe('1,235')
    expect(formatPercent(12.34)).toBe('12,3%')
    expect(formatGb(3.2)).toBe('3,20 GB')
    expect(formatIntensity(85.4)).toBe('85')
    expect(formatNumber(1234.5, 1)).toBe('1.234,5')
  })

  it('monta a localização ignorando a cidade ausente', () => {
    expect(formatLocation('São Paulo', 'Sudeste', 'Brazil')).toBe('São Paulo · Sudeste · Brazil')
    expect(formatLocation(null, 'Sudeste', 'Brazil')).toBe('Sudeste · Brazil')
  })
})
