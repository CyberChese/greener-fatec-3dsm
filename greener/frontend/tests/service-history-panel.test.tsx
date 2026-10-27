import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HistoryRows } from '@/components/admin/service-history-panel'
import type { BackendCollection } from '@/services/backend-services'

const rec = (n: number): BackendCollection => ({
  idCollections: `c${n}`,
  service_id: 's',
  cpu_usage: String(n),
  memory_usage: '1.5',
  storage_usage: '10',
  network_io: '0.25',
  timestamp: `2026-10-19T00:${String(n).padStart(2, '0')}:00.000Z`,
})
const render = (p: Partial<Parameters<typeof HistoryRows>[0]>) =>
  renderToStaticMarkup(<HistoryRows records={[]} loading={false} error={null} page={0} onPage={() => {}} {...p} />)

describe('HistoryRows', () => {
  it('mostra carregando, vazio e erro', () => {
    expect(render({ loading: true })).toContain('Carregando histórico')
    expect(render({})).toContain('Nenhuma coleta registrada neste período')
    expect(render({ error: 'timeout' })).toContain('Não foi possível atualizar o histórico: timeout')
  })

  it('lista da coleta mais recente para a mais antiga, 10 por página', () => {
    const records = Array.from({ length: 12 }, (_, i) => rec(i + 1))
    const html = render({ records })
    expect(html).toContain('Página 1 de 2')
    expect(html.indexOf('12,0%')).toBeLessThan(html.indexOf('3,0%'))
    expect(html).not.toContain('>2,0%<')
    expect(render({ records, page: 1 })).toContain('>2,0%<')
  })

  it('formata unidades (%, GB)', () => {
    const html = render({ records: [rec(5)] })
    expect(html).toContain('5,0%')
    expect(html).toContain('1,50 GB')
    expect(html).toContain('10,00 GB')
    expect(html).toContain('0,25 GB')
  })
})
