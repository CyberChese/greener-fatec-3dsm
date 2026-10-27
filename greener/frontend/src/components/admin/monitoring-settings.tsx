import { CircleCheck, LoaderCircle, Save, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CardHeading, GlassCard } from '@/components/dashboard/glass-card'
import { useSettings } from '@/hooks/useSettings'
import { IS_SIMULATED } from '@/lib/dataSource'
import { INTERVAL_LIMITS, validateSettings, type SettingsErrors } from '@/lib/settings'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const fieldClass =
  'h-11 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 text-sm text-zinc-100 outline-none transition-colors focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/20 aria-[invalid=true]:border-rose-400/60'

/** RF16: parâmetros do monitoramento (somente com sessão autenticada). */
export function MonitoringSettings() {
  const { settings, updateSettings } = useSettings()
  const [intervalText, setIntervalText] = useState(String(settings.intervalSeconds))
  const [period, setPeriod] = useState<string>(settings.defaultPeriod)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [failure, setFailure] = useState<string | null>(null)

  // Reflete no formulário as configurações carregadas ou salvas (ajuste durante a renderização).
  const [syncedSettings, setSyncedSettings] = useState(settings)
  if (syncedSettings !== settings) {
    setSyncedSettings(settings)
    setIntervalText(String(settings.intervalSeconds))
    setPeriod(settings.defaultPeriod)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFailure(null)
    const { errors: found, value } = validateSettings({ intervalSeconds: intervalText, defaultPeriod: period })
    setErrors(found)
    if (!value) {
      setStatus('idle')
      return
    }
    setStatus('saving')
    try {
      await updateSettings(value)
      setStatus('saved')
    } catch (reason) {
      setStatus('error')
      setFailure(reason instanceof Error ? reason.message : 'Não foi possível salvar as configurações.')
    }
  }

  const touch = () => {
    if (status === 'saved' || status === 'error') setStatus('idle')
  }

  return (
    <GlassCard aria-labelledby="settings-title">
      <CardHeading eyebrow="RF16 · Configuração do monitoramento" title="Parâmetros de coleta e exibição" id="settings-title" />
      <form onSubmit={handleSubmit} noValidate className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="cfg-interval" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Intervalo entre coletas (segundos)
          </label>
          <input
            id="cfg-interval"
            type="number"
            inputMode="numeric"
            min={INTERVAL_LIMITS.min}
            max={INTERVAL_LIMITS.max}
            value={intervalText}
            onChange={(e) => {
              setIntervalText(e.target.value)
              touch()
            }}
            aria-invalid={errors.intervalSeconds ? true : undefined}
            aria-describedby="cfg-interval-help"
            className={fieldClass}
          />
          <p
            id="cfg-interval-help"
            className={errors.intervalSeconds ? 'mt-1 text-xs text-rose-300' : 'mt-1 text-xs text-zinc-500'}
          >
            {errors.intervalSeconds ?? `Entre ${INTERVAL_LIMITS.min} e ${INTERVAL_LIMITS.max} s.${IS_SIMULATED ? ' Cada coleta equivale a 15 min simulados.' : ''}`}
          </p>
        </div>

        <div>
          <label htmlFor="cfg-period" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Período padrão do painel
          </label>
          <select
            id="cfg-period"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value)
              touch()
            }}
            aria-invalid={errors.defaultPeriod ? true : undefined}
            aria-describedby="cfg-period-help"
            className={fieldClass}
          >
            <option value="last10">Últimas 10 coletas</option>
            <option value="session">Sessão inteira</option>
          </select>
          <p id="cfg-period-help" className={errors.defaultPeriod ? 'mt-1 text-xs text-rose-300' : 'mt-1 text-xs text-zinc-500'}>
            {errors.defaultPeriod ?? 'Usado ao abrir o painel; você ainda pode trocar no próprio painel.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          <button
            type="submit"
            disabled={status === 'saving'}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-lime-400 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-lime-300 disabled:opacity-60"
          >
            {status === 'saving' ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {status === 'saving' ? 'Salvando…' : 'Salvar configurações'}
          </button>
          {status === 'saved' ? (
            <p role="status" className="inline-flex items-center gap-2 text-sm text-emerald-300">
              <CircleCheck className="size-4" aria-hidden="true" /> Configurações salvas. A coleta já usa o novo intervalo.
            </p>
          ) : null}
          {status === 'error' && failure ? (
            <p role="alert" className="inline-flex items-center gap-2 text-sm text-rose-300">
              <TriangleAlert className="size-4" aria-hidden="true" /> {failure}
            </p>
          ) : null}
        </div>
      </form>
      <p className="mt-4 text-xs text-zinc-500">
        Simulação visual: as configurações ficam neste navegador. No sistema final a alteração é uma rota protegida por JWT e validada
        no backend (RP07).
      </p>
    </GlassCard>
  )
}
