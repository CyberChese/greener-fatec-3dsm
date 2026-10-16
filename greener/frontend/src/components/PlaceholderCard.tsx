import type { ReactNode } from 'react'

type PlaceholderCardProps = {
  eyebrow: string
  title: string
  children: ReactNode
}

// Espaço reservado para blocos que serão implementados em tasks futuras.
export function PlaceholderCard({ eyebrow, title, children }: PlaceholderCardProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-brand">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-prose text-ink-muted">{children}</p>
    </section>
  )
}
