import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ImpactRanking } from '@/components/dashboard/impact-ranking'
import { ServicesGrid } from '@/components/dashboard/services-grid'
import { formatImpact, formatKg, formatKwh } from '@/lib/format'
import { IMPACT_WINDOW_LABEL, LATEST_WINDOW_MS } from '@/services/backend-services'
import { snapshot } from './fixtures'

describe('formatação de energia e emissão (TASK-040)', () => {
  it('valor pequeno não vira zero: mantém 2 algarismos significativos', () => {
    expect(formatKwh(0.0004)).toBe('0,0004')
    expect(formatKg(0.00041)).toBe('0,00041')
    expect(formatImpact(0.00004, 4)).toBe('0,00004')
  })

  it('zero real continua zero e ausência continua "—"', () => {
    expect(formatKwh(0)).toBe('0,000')
    expect(formatKwh(null)).toBe('—')
    expect(formatKg(Number.NaN)).toBe('—')
  })

  it('valores comuns mantêm as casas fixas', () => {
    expect(formatKwh(1.23456)).toBe('1,235')
    expect(formatKg(0.0126)).toBe('0,013')
    expect(formatImpact(0.0126, 4)).toBe('0,0126')
  })
})

describe('período de referência (IHC03)', () => {
  it('o rótulo acompanha a janela consultada no histórico', () => {
    expect(LATEST_WINDOW_MS).toBe(15 * 60_000)
    expect(IMPACT_WINDOW_LABEL).toBe('últimos 15 min')
  })
})

const gridProps = {
  selectedIds: [],
  onToggle: () => {},
  onToggleAll: () => {},
  highlightId: null,
}

describe('cartões com energia e CO₂e por serviço (TASK-040)', () => {
  const render = (totals: Map<string, { energyKwh: number; co2eKg: number; samples: number }>) =>
    renderToStaticMarkup(
      <ServicesGrid
        {...gridProps}
        periodTotals={totals}
        periodLabel={IMPACT_WINDOW_LABEL}
        services={[snapshot({ id: 'a', name: 'Billing API', intensity: 400 })]}
      />,
    )

  it('mostra valores reais com o período de referência', () => {
    const html = render(new Map([['a', { energyKwh: 0.0126, co2eKg: 0.00504, samples: 0 }]]))
    expect(html).toContain('0,013')
    expect(html).toContain('0,005')
    expect(html).toContain('Energia e emissão: últimos 15 min')
    expect(html).toContain('400')
  })

  it('valor pequeno aparece com algarismos significativos, não como 0,000', () => {
    const html = render(new Map([['a', { energyKwh: 0.0004, co2eKg: 0.00016, samples: 0 }]]))
    expect(html).toContain('0,0004')
    expect(html).toContain('0,00016')
    expect(html).not.toContain('0,000 <span')
  })

  it('sem medição mostra "—" e não zero', () => {
    const html = render(new Map())
    expect(html).toContain('—')
    expect(html).not.toContain('0,000')
  })
})

describe('ranking de impacto sem zeros falsos (TASK-040)', () => {
  const services = [
    snapshot({ id: 'a', name: 'Alta' }),
    snapshot({ id: 'b', name: 'Baixa' }),
    snapshot({ id: 'c', name: 'Sem medição' }),
  ]
  const renderRanking = (totals: Map<string, { energyKwh: number; co2eKg: number; samples: number }>, list = services) =>
    renderToStaticMarkup(
      <ImpactRanking
        services={list}
        periodTotals={totals}
        metric="co2e"
        onMetricChange={() => {}}
        periodLabel={IMPACT_WINDOW_LABEL}
      />,
    )

  it('ordena do maior para o menor e informa o período', () => {
    const html = renderRanking(
      new Map([
        ['b', { energyKwh: 0.001, co2eKg: 0.0004, samples: 0 }],
        ['a', { energyKwh: 0.01, co2eKg: 0.004, samples: 0 }],
      ]),
    )
    expect(html.indexOf('Alta')).toBeLessThan(html.indexOf('Baixa'))
    expect(html).toContain('Período considerado: últimos 15 min')
  })

  it('serviço sem medição fica fora do ranking e a omissão é informada', () => {
    const html = renderRanking(new Map([['a', { energyKwh: 0.01, co2eKg: 0.004, samples: 0 }]]))
    expect(html).not.toContain('Sem medição</span>')
    expect(html).toContain('2 serviço(s) sem medição no período não aparecem no ranking.')
  })

  it('sem nenhuma medição avisa em vez de listar zeros', () => {
    const html = renderRanking(new Map())
    expect(html).toContain('Nenhum serviço tem medição de energia e CO₂e no período.')
    expect(html).not.toContain('<ol')
  })

  it('sem serviços após os filtros mantém a mensagem dos filtros', () => {
    expect(renderRanking(new Map(), [])).toContain('Nenhum serviço corresponde aos filtros.')
  })
})

describe('textos que não podem voltar (TASK-040)', () => {
  const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

  it('nenhuma tela diz que energia e CO₂e ainda não são calculados pelo backend', () => {
    for (const file of [
      'components/AppLayout.tsx',
      'components/dashboard/dashboard-view.tsx',
      'components/map/service-popup-content.tsx',
      'lib/dataSource.ts',
    ]) {
      const text = read(file)
      expect(text, file).not.toMatch(/ainda aparecem como/)
      expect(text, file).not.toMatch(/ainda não calculada pelo backend/)
      expect(text, file).not.toMatch(/enquanto o backend não calcular/)
    }
  })
})
