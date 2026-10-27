import { describe, expect, it } from 'vitest'
import { recordsToCsv } from '@/lib/csv'
import { record } from './fixtures'

describe('exportação do histórico em CSV', () => {
  it('gera cabeçalho e uma linha por registro', () => {
    const lines = recordsToCsv([record(), record({ tick: 2 })]).split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(
      'coleta,horario_simulado,recebida_em,servico_id,servico,regiao,estado,cpu_percent,memoria_gb,energia_kwh,co2e_kg',
    )
    expect(lines[1].startsWith('1,2026-10-10T12:00:00.000Z,')).toBe(true)
  })

  it('valores ausentes ficam vazios (e não 0)', () => {
    const line = recordsToCsv([record({ cpuPercent: null, energyKwh: null, co2eKg: null })]).split('\n')[1]
    // últimos campos: cpu_percent, memoria_gb, energia_kwh, co2e_kg
    expect(line.split(',').slice(-4)).toEqual(['', '8', '', ''])
  })

  it('escapa vírgulas e aspas no nome do serviço', () => {
    const line = recordsToCsv([record({ serviceName: 'API "Core", v2' })]).split('\n')[1]
    expect(line).toContain('"API ""Core"", v2"')
  })

  it('sem registros devolve só o cabeçalho', () => {
    expect(recordsToCsv([]).split('\n')).toHaveLength(1)
  })
})
