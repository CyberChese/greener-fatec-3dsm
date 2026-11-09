import { useContext } from 'react'
import { SettingsContext } from '@/contexts/SettingsContext'
import type { SettingsContextValue } from '@/contexts/SettingsContext'

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings deve ser usado dentro de <SettingsProvider>')
  return context
}
