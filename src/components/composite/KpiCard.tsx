import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface KpiCardProps {
  label: string
  /** Headline figure: a formatted string, or an <AnimatedNumber />. */
  value: ReactNode
  /** One line of context under the figure, e.g. "of EUR 350K target". */
  context?: ReactNode
  /** Trend indicator, usually a <DeltaBadge />. */
  trend?: ReactNode
  /** Secondary line at the bottom of the card. */
  footer?: ReactNode
  icon?: LucideIcon
  /** 0..1 progress rail drawn along the bottom edge. */
  progress?: number | null
  progressTone?: 'accent' | 'positive' | 'warning' | 'negative'
  className?: string
}

const progressTones = {
  accent: 'bg-accent',
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
}

export function KpiCard({
  label,
  value,
  context,
  trend,
  footer,
  icon: Icon,
  progress,
  progressTone = 'accent',
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'group relative flex min-w-0 flex-col gap-3 overflow-hidden bg-surface p-5',
        'transition-colors duration-200 hover:bg-elevated',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="size-3.5 shrink-0 text-ink-faint" aria-hidden /> : null}
        <p className="truncate text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
          {label}
        </p>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <div className="tnum text-metric font-semibold leading-none tracking-tight text-ink">
          {value}
        </div>
        {trend}
      </div>

      {context ? <div className="text-xs leading-relaxed text-ink-muted">{context}</div> : null}
      {footer ? <div className="mt-auto pt-1 text-xs text-ink-faint">{footer}</div> : null}

      {typeof progress === 'number' ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-line" aria-hidden>
          <span
            className={cn(
              'block h-full transition-[width] duration-700 ease-out-soft',
              progressTones[progressTone],
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </span>
      ) : null}
    </div>
  )
}
