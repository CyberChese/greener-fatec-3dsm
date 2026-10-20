import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './AuthProvider.tsx'

type AppProvidersProps = {
  children: ReactNode
}

// Ponto único para juntar os providers da aplicação.
// Ao criar um novo context (ex.: seleção de serviço/período), envolva-o aqui.
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  )
}
