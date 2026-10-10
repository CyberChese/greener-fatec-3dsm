import type { ReactNode } from 'react'

type AppProvidersProps = {
  children: ReactNode
}

// Ponto único para juntar os contexts da aplicação.
// Ao criar um novo context (autenticação, seleção de serviço/período...), envolva-o aqui.
export function AppProviders({ children }: AppProvidersProps) {
  return <>{children}</>
}
