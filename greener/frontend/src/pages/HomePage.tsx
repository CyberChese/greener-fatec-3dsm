import { StatusBadge } from '../components/StatusBadge.tsx'
import type { ServiceState } from '../types/service.ts'

const STATES: ServiceState[] = ['available', 'metrics_missing', 'unavailable', 'removed']

// Página provisória: serve para validar a estrutura e o tema.
// A tela real (mapa, indicadores e tabela de serviços) entra nas próximas tasks.
export function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Observatório</h1>
        <p className="max-w-prose text-lg text-ink-muted">
          Estimativa do consumo de energia e das emissões de CO₂e de aplicações de software.
          Esta consulta é pública: não exige login.
        </p>
      </header>

      <section
        aria-labelledby="estados-titulo"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id="estados-titulo" className="mb-4 text-base font-medium">
          Estados dos serviços
        </h2>
        <ul className="flex flex-wrap gap-3">
          {STATES.map((state) => (
            <li key={state}>
              <StatusBadge state={state} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
