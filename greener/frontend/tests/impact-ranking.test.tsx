// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ImpactRanking, RankBadge } from '@/components/dashboard/impact-ranking'
import type { RankingMetric } from '@/lib/types'
import { snapshot } from './fixtures'

afterEach(cleanup)

const services = [
  snapshot({ id: 'a', name: 'Billing API', status: 'active' }),
  snapshot({ id: 'b', name: 'Checkout Worker', status: 'unavailable' }),
  snapshot({ id: 'c', name: 'Inventory Sync', status: 'no_metrics' }),
  snapshot({ id: 'd', name: 'Sem Medicao', status: 'active' }),
]

// "Billing" consome menos, mas emite mais; "Checkout" é o contrário. A ordem muda conforme a métrica.
const totals = new Map([
  ['a', { energyKwh: 0.002, co2eKg: 0.0009 }],
  ['b', { energyKwh: 0.009, co2eKg: 0.0003 }],
  ['c', { energyKwh: 0.0005, co2eKg: 0.0001 }],
])

function Harness({ initial = 'co2e' as RankingMetric }) {
  const [metric, setMetric] = useState<RankingMetric>(initial)
  return (
    <ImpactRanking
      services={services}
      periodTotals={totals}
      metric={metric}
      onMetricChange={setMetric}
      periodLabel="últimos 15 min"
    />
  )
}

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')
const names = () => bodyRows().map((row) => within(row).getAllByRole('cell')[1].textContent ?? '')

describe('tela de ranking de impacto (TASK-043)', () => {
  it('lista os serviços com posição, nome, status, consumo e emissão', () => {
    render(<Harness />)
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Posição', 'Serviço', 'Consumo (kWh)', 'Emissão (kgCO₂e)'])

    const first = within(bodyRows()[0]).getAllByRole('cell')
    expect(first[0].textContent).toContain('1º')
    expect(first[1].textContent).toContain('Billing API')
    expect(first[1].textContent).toContain('Ativo')
    expect(first[2].textContent).toBe('0,002')
    expect(first[3].textContent).toBe('0,0009')
  })

  it('ordena por emissão e reorganiza ao escolher "Maior consumo (kWh)" sem recarregar', () => {
    render(<Harness />)
    expect(names().map((n) => n.slice(0, 8))).toEqual(['Billing ', 'Checkout', 'Inventor'])

    fireEvent.click(screen.getByRole('button', { name: /Maior consumo \(kWh\)/ }))
    expect(names().map((n) => n.slice(0, 8))).toEqual(['Checkout', 'Billing ', 'Inventor'])
    expect(screen.getByRole('button', { name: /Maior consumo \(kWh\)/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Maior emissão \(CO₂e\)/ }).getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(screen.getByRole('button', { name: /Maior emissão \(CO₂e\)/ }))
    expect(names()[0]).toContain('Billing API')
  })

  it('marca a coluna usada na ordenação com aria-sort', () => {
    render(<Harness />)
    expect(screen.getByRole('columnheader', { name: 'Emissão (kgCO₂e)' }).getAttribute('aria-sort')).toBe('descending')
    expect(screen.getByRole('columnheader', { name: 'Consumo (kWh)' }).getAttribute('aria-sort')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Maior consumo \(kWh\)/ }))
    expect(screen.getByRole('columnheader', { name: 'Consumo (kWh)' }).getAttribute('aria-sort')).toBe('descending')
  })

  it('mostra o status de cada serviço (ícone e texto para leitor de tela) e o período considerado', () => {
    render(<Harness />)
    const texts = bodyRows().map((row) => within(row).getAllByRole('cell')[1].textContent ?? '')
    expect(texts[0]).toMatch(/Ativo$/)
    expect(texts[1]).toMatch(/Indisponível$/)
    expect(texts[2]).toMatch(/Sem métricas$/)
    expect(screen.getByText('Período considerado: últimos 15 min')).toBeTruthy()
  })

  it('omite serviço sem medição e informa a quantidade', () => {
    render(<Harness />)
    expect(screen.queryByText('Sem Medicao')).toBeNull()
    expect(screen.getByText('1 serviço(s) sem medição no período não aparecem no ranking.')).toBeTruthy()
  })
})

describe('selo de posição (TASK-043)', () => {
  it('destaca o 1º lugar com texto e número, não só com cor', () => {
    render(<RankBadge position={1} />)
    const badge = screen.getByText(/Maior impacto/).closest('span[data-rank]')
    expect(badge?.textContent).toBe('1º · Maior impacto')
    expect(badge?.getAttribute('data-rank')).toBe('1')
  })

  it('mostra o número nas demais posições', () => {
    render(
      <>
        <RankBadge position={2} />
        <RankBadge position={7} />
      </>,
    )
    expect(screen.getByText('2º')).toBeTruthy()
    expect(screen.getByText('7º')).toBeTruthy()
  })
})
