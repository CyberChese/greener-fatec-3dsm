import { createContext } from 'react'
import type { MonitoringSettings } from '@/lib/settings'

export interface SettingsContextValue {
  settings: MonitoringSettings
  /** Verdadeiro depois que as configurações salvas foram lidas. */
  ready: boolean
  updateSettings: (next: MonitoringSettings) => Promise<void>
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
