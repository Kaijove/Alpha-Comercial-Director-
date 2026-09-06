import type { ReactNode } from 'react'
import type { HealthBand } from '@/domain/intelligence/opportunityScoring'
import type { ForecastState, ScenarioKey } from '@/domain/forecast/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

/**
 * The small shared pieces of the forecast's visual language.
 *
 * Colour carries meaning here and nothing else: a state has one tone across
 * every panel, so a director learns the palette once.
 */
type Tone = 'neutral' | 'accent' | 'positive' | 'warning' | 'negative'

export const STATE_TONE: Record<ForecastState, Tone> = {
  'above-target': 'positive',
  'on-track': 'accent',
  'at-risk': 'warning',
  critical: 'negative',
}

export const STATE_LABEL: Record<ForecastState, string> = {
  'above-target': 'Above Target',
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  critical: 'Critical',
}

export const SCENARIO_TONE: Record<ScenarioKey, Tone> = {
  worst: 'warning',
  base: 'accent',
  best: 'positive',
}

export const BAND_TONE: Record<HealthBand, Tone> = {
  healthy: 'positive',
  attention: 'accent',
  'at-risk': 'warning',
  critical: 'negative',
}

const dotTones: Record<Tone, string> = {
  neutral: 'bg-ink-faint',
  accent: 'bg-accent',
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
}

export function StateBadge({ state }: { state: ForecastState }) {
  return (
    <Badge tone={STATE_TONE[state]}>
      <span className={cn('size-1.5 rounded-full', dotTones[STATE_TONE[state]])} aria-hidden />
      {STATE_LABEL[state]}
    </Badge>
  )
}

/**
 * A horizontal 0-100 rail.
 *
 * Chosen over a circular gauge on purpose: a rail is readable at a glance, sits
 * quietly in a dense page, and does not turn a probability into a dial that
 * looks like a slot machine.
 */
export function ScoreRail({
  score,
  tone = 'accent',
  className,
}: {
  score: number
  tone?: Tone
  className?: string
}) {
  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-full bg-line', className)}
      role="presentation"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out-soft', dotTones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
      />
    </div>
  )
}

/** Label / value row used throughout the forecast panels. */
export function StatRow({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={cn('text-body', emphasis ? 'text-ink' : 'text-ink-muted')}>
        {label}
        {hint ? <span className="ml-2 text-xs text-ink-faint">{hint}</span> : null}
      </span>
      <span
        className={cn(
          'tnum shrink-0 text-body',
          emphasis ? 'font-medium text-ink' : 'text-ink-subtle',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** Section label used above grouped content inside a panel. */
export function MicroLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
      {children}
    </p>
  )
}
