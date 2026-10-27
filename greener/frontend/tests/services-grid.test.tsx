import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SERVICES_GRID_CLASSES, ServicesGrid } from '@/components/dashboard/services-grid'
import { snapshot } from './fixtures'

const props = {
  periodTotals: new Map(),
  periodLabel: 'período',
  selectedIds: [],
  onToggle: () => {},
  onToggleAll: () => {},
  highlightId: null,
}

const render = (services: ReturnType<typeof snapshot>[]) => renderToStaticMarkup(<ServicesGrid {...props} services={services} />)

describe('ServicesGrid / ServiceCard (TASK-025)', () => {
  it('mostra o selo de cada estado com o texto exigido', () => {
    const html = render([
      snapshot({ id: 'a', name: 'A', status: 'active' }),
      snapshot({ id: 'b', name: 'B', status: 'unavailable' }),
      snapshot({ id: 'c', name: 'C', status: 'no_metrics' }),
    ])
    expect(html).toContain('Ativo e Monitorado')
    expect(html).toContain('Serviço Indisponível')
    expect(html).toContain('Sem Métricas')
    expect(html).toContain('data-status="active"')
    expect(html).toContain('data-status="unavailable"')
    expect(html).toContain('data-status="no_metrics"')
  })

  it('mostra nome, nuvem/região e consumo atual', () => {
    const html = render([snapshot({ name: 'Billing API', powerWatts: 123.4 })])
    expect(html).toContain('Billing API')
    expect(html).toContain('br-sudeste')
    expect(html).toContain('Sudeste')
    expect(html).toContain('123,4 W')
  })

  it('usa "—" quando o consumo ainda não foi calculado', () => {
    expect(render([snapshot({ powerWatts: null })])).toContain('Consumo atual: <span class="font-mono text-zinc-100">—')
  })

  it('organiza em 1 coluna no mobile e 3/4 no desktop', () => {
    expect(SERVICES_GRID_CLASSES).toContain('grid-cols-1')
    expect(SERVICES_GRID_CLASSES).toContain('lg:grid-cols-3')
    expect(SERVICES_GRID_CLASSES).toContain('2xl:grid-cols-4')
  })

  it('avisa quando nenhum serviço corresponde aos filtros', () => {
    expect(render([])).toContain('Nenhum serviço corresponde')
  })
})
