import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '@/components/dashboard/status-badge'

describe('StatusBadge (TASK-025)', () => {
  it.each([
    ['active', 'Ativo e Monitorado', 'text-state-ok'],
    ['unavailable', 'Serviço Indisponível', 'text-state-down'],
    ['no_metrics', 'Sem Métricas', 'text-state-warn'],
  ] as const)('estado %s mostra o texto e a cor corretos', (status, label, colorClass) => {
    const html = renderToStaticMarkup(<StatusBadge status={status} />)
    expect(html).toContain(label)
    expect(html).toContain(colorClass)
  })
})
