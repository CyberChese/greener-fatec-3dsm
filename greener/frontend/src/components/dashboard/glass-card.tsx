import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function GlassCard({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-white/[0.08] bg-zinc-900/40 p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeading({
  eyebrow,
  title,
  id,
  aside,
}: {
  eyebrow?: string
  title: string
  id?: string
  aside?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.14em] text-lime-400 uppercase">{eyebrow}</p>
        ) : null}
        <h2 id={id} className="text-base font-semibold text-zinc-100 text-balance">
          {title}
        </h2>
      </div>
      {aside}
    </div>
  )
}
