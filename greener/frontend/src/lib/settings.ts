import type { Period } from './types'

export interface MonitoringSettings {
  /** Intervalo entre coletas, em segundos. */
  intervalSeconds: number
  /** Período usado ao abrir o painel. */
  defaultPeriod: Period
}

export const DEFAULT_SETTINGS: MonitoringSettings = { intervalSeconds: 3, defaultPeriod: 'last10' }
export const INTERVAL_LIMITS = { min: 1, max: 60 } as const

export type SettingsErrors = Partial<Record<keyof MonitoringSettings, string>>

export interface SettingsDraft {
  intervalSeconds: string
  defaultPeriod: string
}

const isPeriod = (value: string): value is Period => value === 'last10' || value === 'session'

/** Valida o formulário de configuração. Retorna os erros por campo e, se válido, o valor tipado. */
export function validateSettings(draft: SettingsDraft): { errors: SettingsErrors; value: MonitoringSettings | null } {
  const errors: SettingsErrors = {}
  const text = draft.intervalSeconds.trim()
  const seconds = Number(text)

  if (text === '') errors.intervalSeconds = 'Informe o intervalo em segundos.'
  else if (!Number.isInteger(seconds)) errors.intervalSeconds = 'Use um número inteiro de segundos.'
  else if (seconds < INTERVAL_LIMITS.min || seconds > INTERVAL_LIMITS.max) {
    errors.intervalSeconds = `O intervalo deve estar entre ${INTERVAL_LIMITS.min} e ${INTERVAL_LIMITS.max} segundos.`
  }

  if (!isPeriod(draft.defaultPeriod)) errors.defaultPeriod = 'Escolha um período válido.'

  if (Object.keys(errors).length > 0 || !isPeriod(draft.defaultPeriod)) return { errors, value: null }
  return { errors, value: { intervalSeconds: seconds, defaultPeriod: draft.defaultPeriod } }
}
