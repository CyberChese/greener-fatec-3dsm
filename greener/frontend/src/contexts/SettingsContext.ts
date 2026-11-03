import { createContext } from 'react'
import type { MonitoringSettings } from '@/lib/settings'

export interface SettingsContextValue {
  settings: MonitoringSettings
  /** Verdadeiro depois que as configurações salvas foram lidas. */
  ready: boolean
  /** Verdadeiro quando o usuário salvou configurações personalizadas neste navegador. */
  hasCustomSettings: boolean
  updateSettings: (next: MonitoringSettings) => Promise<void>
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
