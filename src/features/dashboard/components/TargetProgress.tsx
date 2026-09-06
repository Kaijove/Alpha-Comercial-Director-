import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { AnimatedNumber } from '@/components/composite/AnimatedNumber'
import { Panel } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

type Pacing = 'ahead' | 'on' | 'behind'

function pacingOf(pace: number | null): Pacing {
  if (pace === null) return 'on'
  if (pace >= 1.03) return 'ahead'
  if (pace >= 0.95) return 'on'
  return 'behind'
}

const pacingCopy: Record<Pacing, { label: string; tone: string; bar: string }> = {
  ahead: { label: 'Ahead of pace', tone: 'text-positive', bar: 'bg-positive' },
  on: { label: 'On pace', tone: 'text-accent', bar: 'bg-accent' },
  behind: { label: 'Behind pace', tone: 'text-warning', bar: 'bg-warning' },
}

/**
 * Target progress with the context that makes it actionable: where the business
 * should be by today, what is left, and the daily run rate required.
 */
export function TargetProgress({ metrics }: { metrics: CommercialMetrics }) {
  const fmt = useFormatters()
  const pacing = pacingOf(metrics.pace)
  const copy = pacingCopy[pacing]

  const attainment = metrics.attainment ?? 0
  const progress = Math.min(100, Math.max(0, attainment * 100))
  const paceMarker = Math.min(100, Math.max(0, metrics.period.elapsedFraction * 100))

  return (
    <Panel className="flex flex-col">
      <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
        Target progress
      </p>

      <div className="mt-4 space-y-1">
        <p className="tnum text-metric-lg font-semibold leading-none tracking-tight text-ink">
          <AnimatedNumber
            value={metrics.revenue}
            format={fmt.currency}
            title={`Exactly ${fmt.exact(metrics.revenue)}`}
          />
        </p>
        <p className="text-body text-ink-muted">
          of <span className="tnum">{fmt.currency(metrics.target)}</span>{' '}
          {metrics.period.label.toLowerCase()} target
        </p>
      </div>

      <div className="mt-6 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span className={cn('text-body font-medium', copy.tone)}>{copy.label}</span>
          <span className="tnum text-title font-semibold text-ink">
            {fmt.percent(attainment, 1)}
          </span>
        </div>

        <div className="relative h-2 overflow-hidden rounded-full bg-line">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-700 ease-out-soft',
              copy.bar,
            )}
            style={{ width: `${progress}%` }}
          />
          {/* Where the business should be today, given the days elapsed. */}
          <span
            className="absolute inset-y-0 w-px bg-ink-muted"
            style={{ left: `${paceMarker}%` }}
            aria-hidden
          />
        </div>

        <div className="flex justify-between text-2xs text-ink-faint">
          <span>
            Expected by today{' '}
            <span className="tnum text-ink-subtle">{fmt.currency(metrics.expectedByNow)}</span>
          </span>
          <span className="tnum">{Math.round(paceMarker)}% of period elapsed</span>
        </div>
      </div>

      <dl className="mt-6 space-y-3 border-t border-line pt-5 text-body">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-muted">Remaining</dt>
          <dd className="tnum font-medium text-ink">
            {fmt.currency(metrics.remainingToTarget)}
          </dd>
        </div>
        {metrics.perDayNeeded !== null ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">Needed per day</dt>
            <dd className="tnum font-medium text-ink">
              {fmt.currency(metrics.perDayNeeded)}
              <span className="ml-1.5 font-normal text-ink-faint">
                / {metrics.period.remainingDays}d left
              </span>
            </dd>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">Days left</dt>
            <dd className="tnum font-medium text-ink">Period closed</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-muted">Previous period</dt>
          <dd className="tnum font-medium text-ink">
            {fmt.currency(metrics.previousRevenue)}
          </dd>
        </div>
      </dl>
    </Panel>
  )
}
