import { CalendarClock, Coins, Compass, Layers, Scale } from 'lucide-react'
import type { PipelineMetrics } from '@/domain/metrics/pipelineMetrics'
import { AnimatedNumber } from '@/components/composite/AnimatedNumber'
import { KpiCard } from '@/components/composite/KpiCard'
import { HEALTHY_COVERAGE } from '@/domain/health/commercialHealth'
import { isCoverageAmple } from '@/domain/metrics/primitives'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * The pipeline header figures. Every one comes from `computePipelineMetrics`,
 * which in turn uses the shared primitives, so they match the Dashboard and
 * Analytics wherever the scope matches.
 */
export function PipelineKpis({ metrics }: { metrics: PipelineMetrics }) {
  const fmt = useFormatters()

  return (
    <div className="space-y-3">
      <section
        aria-label="Pipeline indicators"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        <KpiCard
          label="Total pipeline"
          icon={Coins}
          value={
            <AnimatedNumber
              value={metrics.total}
              format={fmt.currency}
              title={`Exactly ${fmt.exact(metrics.total)}`}
            />
          }
          context="Face value of everything open"
        />

        <KpiCard
          label="Weighted pipeline"
          icon={Scale}
          value={
            <AnimatedNumber
              value={metrics.weighted}
              format={fmt.currency}
              title={`Exactly ${fmt.exact(metrics.weighted)}`}
            />
          }
          context="Value x probability, per deal"
        />

        <KpiCard
          label="Open opportunities"
          icon={Layers}
          value={
            <AnimatedNumber
              value={metrics.openCount}
              format={(value) => fmt.number(value, 0)}
            />
          }
          context={
            metrics.averageDealSize !== null ? (
              <>{fmt.currency(metrics.averageDealSize)} average deal size</>
            ) : (
              'Nothing open in this selection'
            )
          }
        />

        <KpiCard
          label="Expected revenue"
          icon={Compass}
          value={
            <AnimatedNumber
              value={metrics.expectedThisMonth}
              format={fmt.currency}
              title={`Weighted value of deals expected to close before the month ends: ${fmt.exact(metrics.expectedThisMonth)}`}
            />
          }
          context="Weighted, closing before month end"
        />

        <KpiCard
          label="Closing this month"
          icon={CalendarClock}
          value={
            <AnimatedNumber
              value={metrics.closingThisMonthCount}
              format={(value) => fmt.number(value, 0)}
            />
          }
          context={
            metrics.closingThisMonthCount === 1
              ? 'opportunity with a close date this month'
              : 'opportunities with a close date this month'
          }
        />
      </section>

      {/* Secondary figures: business-wide, not filtered, and labelled as such. */}
      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-xs text-ink-faint">
        <span>
          Win rate, last 90 days{' '}
          <span className="tnum text-ink-subtle">
            {metrics.winRate !== null ? fmt.percent(metrics.winRate, 1) : '—'}
          </span>
        </span>
        <span aria-hidden>·</span>
        <span>
          Pipeline coverage{' '}
          <span className="tnum text-ink-subtle">
            {metrics.coverage === null
              ? 'target covered'
              : isCoverageAmple(metrics.coverage)
                ? 'ample'
                : `${fmt.number(metrics.coverage, 1)}x`}
          </span>{' '}
          against {fmt.currency(metrics.remainingTarget)} left this month
          {metrics.coverage !== null && !isCoverageAmple(metrics.coverage)
            ? ` (${HEALTHY_COVERAGE}x is healthy)`
            : ''}
        </span>
      </p>
    </div>
  )
}
