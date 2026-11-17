import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FiltersBar } from '@/components/dashboard/filters-bar'
import { DEFAULT_FILTERS, type TimeFilters } from '@/lib/dashboard-filters'

const render = (filters: TimeFilters, extra: { loading?: boolean; error?: string | null } = {}) =>
  renderToStaticMarkup(
    <FiltersBar
      filters={filters}
      setPreset={() => {}}
      applyCustomRange={() => {}}
      setSearch={() => {}}
      clear={() => {}}
      periodLabel="últimos 7 dias"
      resultCount={3}
      totalCount={8}
      today="2026-11-16"
      {...extra}
    />,
  )

describe('FiltersBar (TASK-045)', () => {
  it('oferece os atalhos de período e marca o que está aplicado', () => {
    const html = render(DEFAULT_FILTERS)
    for (const label of ['Últimas 24h', 'Últimos 7 dias', '30 dias', 'Personalizado']) expect(html).toContain(label)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Últimos 7 dias/)
    expect(html).toMatch(/aria-pressed="false"[^>]*>Últimas 24h/)
    expect(html).not.toContain('type="date"')
  })

  it('tem campo de busca por nome com rótulo', () => {
    const html = render({ ...DEFAULT_FILTERS, search: 'billing' })
    expect(html).toContain('Buscar serviço por nome')
    expect(html).toContain('value="billing"')
    expect(html).toContain('3 de 8 serviços exibidos.')
  })

  it('o período personalizado abre as datas preenchidas com o intervalo aplicado', () => {
    const html = render({ preset: 'custom', from: '2026-11-01', to: '2026-11-10', search: '' })
    expect(html).toContain('value="2026-11-01"')
    expect(html).toContain('value="2026-11-10"')
    expect(html).toContain('max="2026-11-16"')
    expect(html).toContain('Período aplicado')
  })

  it('só mostra o botão de limpar quando há filtro diferente do padrão', () => {
    expect(render(DEFAULT_FILTERS)).not.toContain('Limpar período e busca')
    expect(render({ ...DEFAULT_FILTERS, preset: '24h' })).toContain('Limpar período e busca')
  })

  it('informa carregamento e falha sem esconder os controles', () => {
    expect(render(DEFAULT_FILTERS, { loading: true })).toContain('Atualizando para')
    const failed = render(DEFAULT_FILTERS, { error: 'offline' })
    expect(failed).toContain('role="alert"')
    expect(failed).toContain('offline')
    expect(failed).toContain('Últimas 24h')
  })
})
