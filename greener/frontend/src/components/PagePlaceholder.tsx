import type { ReactNode } from 'react'

type PagePlaceholderProps = {
  title: string
  children?: ReactNode
}

// Estrutura provisória das telas que ainda serão implementadas.
export function PagePlaceholder({ title, children }: PagePlaceholderProps) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-brand">{title}</h1>
      <div className="max-w-prose text-ink-muted">{children}</div>
    </section>
  )
}
