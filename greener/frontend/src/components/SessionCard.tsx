import type { Session } from '../contexts/AuthContext.ts'
import { ShieldCheckIcon } from './icons.tsx'

type SessionCardProps = {
  session: Session | null
}

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// Mostra quem está logado. Nunca exibe o token em si: só e-mail, papel e expiração.
export function SessionCard({ session }: SessionCardProps) {
  return (
    <section
      aria-label="Sessão autenticada"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5"
    >
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-state-ok/10 text-state-ok">
          <ShieldCheckIcon />
        </span>
        <p className="text-state-ok">
          Sessão autenticada · {session?.email ?? 'administrador'}
        </p>
      </div>
      <dl className="flex flex-col gap-0.5 text-sm text-ink-muted sm:text-right">
        {session?.role && (
          <div>
            <dt className="inline">Papel: </dt>
            <dd className="inline text-ink">{session.role}</dd>
          </div>
        )}
        {session?.expiresAt && (
          <div>
            <dt className="inline">Expira em: </dt>
            <dd className="inline text-ink">
              {dateTimeFormat.format(session.expiresAt).replace(',', '')}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
