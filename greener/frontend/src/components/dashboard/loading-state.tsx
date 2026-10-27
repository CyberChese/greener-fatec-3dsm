import { LoaderCircle, ServerCrash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from './glass-card'

function Block({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-2xl border border-white/[0.06] bg-zinc-900/40', className)}
    />
  )
}

/** Exibido até a primeira coleta terminar (IHC04: indicação de carregamento). */
export function DashboardSkeleton() {
  return (
    <div id="view-dashboard" role="tabpanel" aria-busy="true" className="flex flex-col gap-5">
      <p role="status" className="flex items-center gap-2 text-sm text-zinc-400">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Aguardando a primeira coleta dos serviços…
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Block key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Block className="h-80" />
        <Block className="h-80" />
      </div>
      <Block className="h-64" />
    </div>
  )
}

/** Exibido quando a coleta terminou, mas nenhum serviço foi descoberto (IHC04: ausência de dados / erro). */
export function EmptyServices({ error }: { error: string | null }) {
  return (
    <div id="view-dashboard" role="tabpanel">
      <GlassCard className="mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center" role="alert">
        <ServerCrash className="size-8 text-orange-300" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-zinc-100">Nenhum serviço disponível no momento</h1>
        <p className="text-sm text-zinc-400">
          {error ?? 'O backend não retornou serviços nesta coleta.'} A coleta continua sendo tentada
          automaticamente.
        </p>
      </GlassCard>
    </div>
  )
}
