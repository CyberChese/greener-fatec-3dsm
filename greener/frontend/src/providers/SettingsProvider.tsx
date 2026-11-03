import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SettingsContext } from '@/contexts/SettingsContext'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import type { MonitoringSettings } from '@/lib/settings'
import { hasSavedSettings, loadSettings, saveSettings } from '@/services/settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<MonitoringSettings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [hasCustomSettings, setHasCustomSettings] = useState(() => hasSavedSettings())

  useEffect(() => {
    let active = true
    void loadSettings().then((loaded) => {
      if (!active) return
      setSettings(loaded)
      setHasCustomSettings(hasSavedSettings())
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  const updateSettings = useCallback(async (next: MonitoringSettings) => {
    await saveSettings(next)
    setSettings(next)
    setHasCustomSettings(true)
  }, [])

  const value = useMemo(
    () => ({ settings, ready, hasCustomSettings, updateSettings }),
    [settings, ready, hasCustomSettings, updateSettings],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
