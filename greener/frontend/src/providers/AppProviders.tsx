import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './AuthProvider.tsx'
import { MetricsProvider } from './MetricsProvider.tsx'
import { SettingsProvider } from './SettingsProvider.tsx'

type AppProvidersProps = {
  children: ReactNode
}

// Ponto único para juntar os providers da aplicação.
// Ao criar um novo context, envolva-o aqui.
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <MetricsProvider>{children}</MetricsProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
