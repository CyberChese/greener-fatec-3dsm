import type { ServiceStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { STATUS_META } from './status-meta'

export function StatusBadge({ status, className }: { status: ServiceStatus; className?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        meta.badgeClass,
        className,
      )}
      title={meta.description}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.badgeLabel}
    </span>
  )
}
