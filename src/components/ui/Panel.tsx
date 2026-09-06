import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes the inner padding for tables and full-bleed content. */
  flush?: boolean
}

export function Panel({ className, flush = false, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-panel border border-line bg-surface shadow-panel',
        !flush && 'p-6',
        className,
      )}
      {...props}
    />
  )
}

export interface PanelHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function PanelHeader({ title, description, action, className }: PanelHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-6', className)}>
      <div className="space-y-1">
        <h2 className="text-title font-medium tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="max-w-prose text-body leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle',
        className,
      )}
    >
      {children}
    </p>
  )
}
