import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface DeltaBadgeProps {
  /** Signed change. Null renders a neutral "no comparison" state. */
  value: number | null
  /** Pre-formatted text, e.g. "+12.4%" or "+4.2 pp". */
  label: string
  /** Set false when a rise is bad (e.g. sales cycle length). */
  higherIsBetter?: boolean
  /** Below this magnitude the change reads as flat. */
  threshold?: number
  className?: string
}

/**
 * Trend indicator used by every KPI in the product. Direction is shown by an
 * arrow as well as colour, so it never depends on colour alone.
 */
export function DeltaBadge({
  value,
  label,
  higherIsBetter = true,
  threshold = 0.005,
  className,
}: DeltaBadgeProps) {
  if (value === null || Number.isNaN(value)) {
    return (
      <span className={cn('text-2xs text-ink-faint', className)}>No comparison</span>
    )
  }

  const flat = Math.abs(value) < threshold
  const good = higherIsBetter ? value > 0 : value < 0
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-medium tabular-nums',
        flat
          ? 'bg-raised text-ink-subtle'
          : good
            ? 'bg-positive/12 text-positive'
            : 'bg-negative/12 text-negative',
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  )
}
