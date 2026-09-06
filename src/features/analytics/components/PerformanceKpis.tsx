import {
  BarChart3,
  Clock,
  Coins,
  Compass,
  Percent,
  Target,
  TrendingUp,
} from 'lucide-react'
import type { AnalyticsMetrics } from '@/domain/metrics/analyticsMetrics'
import { AnimatedNumber } from '@/components/composite/AnimatedNumber'
import { DeltaBadge } from '@/components/composite/DeltaBadge'
import { KpiCard } from '@/components/composite/KpiCard'
import { HEALTHY_COVERAGE } from '@/domain/health/commercialHealth'
import { isCoverageAmple } from '@/domain/metrics/primitives'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * Executive performance strip.
 *
 * Same primitives as the dashboard KPIs, applied to the analytics window, so
 * the two screens agree wherever the windows do. Every indicator carries its
 * current value, its context, the change and the previous-period figure - the
 * one exception is pipeline coverage, which is a point-in-time measure with no
 * history to compare against, and says so rather than inventing one.
 */
export function PerformanceKpis({ metrics }: { metrics: AnalyticsMetrics }) {
  const fmt = useFormatters()
  const signedPercent = (ratio: number) =>
    `${ratio >= 0 ? '+' : ''}${fmt.number(ratio * 100, 1)}%`

  return (
    <section
      aria-label="Performance indicators"
      className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
    >
      <KpiCard
        label="Revenue"
        icon={Coins}
        value={
          <AnimatedNumber
            value={metrics.revenue}
            format={fmt.currency}
            title={`Exactly ${fmt.exact(metrics.revenue)}`}
          />
        }
        trend={
          <DeltaBadge
            value={metrics.growthRatio}
            label={metrics.growthRatio === null ? '' : signedPercent(metrics.growthRatio)}
          />
        }
        context={<>of {fmt.currency(metrics.target)} target</>}
        footer={`${fmt.currency(metrics.previousRevenue)} previous period`}
      />

      <KpiCard
        label="Growth"
        icon={TrendingUp}
        value={
          <AnimatedNumber
            value={metrics.growthAbsolute}
            format={(value) => fmt.signed(value)}
            title={`${fmt.exact(metrics.revenue)} against ${fmt.exact(metrics.previousRevenue)}`}
          />
        }
        trend={
          <DeltaBadge
            value={metrics.growthRatio}
            label={metrics.growthRatio === null ? '' : signedPercent(metrics.growthRatio)}
          />
        }
        context="Absolute change vs previous period"
        footer={`${fmt.currency(metrics.revenue)} vs ${fmt.currency(metrics.previousRevenue)}`}
      />

      <KpiCard
        label="Target attainment"
        icon={Target}
        value={
          metrics.attainment !== null ? (
            <AnimatedNumber
              value={metrics.attainment}
              format={(value) => fmt.percent(value, 1)}
              title={`${fmt.exact(metrics.revenue)} of ${fmt.exact(metrics.target)}`}
            />
          ) : (
            '—'
          )
        }
        trend={
          <DeltaBadge
            value={metrics.attainmentDelta}
            label={
              metrics.attainmentDelta === null ? '' : fmt.points(metrics.attainmentDelta)
            }
          />
        }
        context={<>of {fmt.currency(metrics.target)} for this window</>}
        footer={
          metrics.previousAttainment !== null
            ? `${fmt.percent(metrics.previousAttainment, 1)} previous period`
            : undefined
        }
        progress={metrics.attainment}
        progressTone={
          (metrics.attainment ?? 0) >= 1
            ? 'positive'
            : (metrics.attainment ?? 0) >= 0.9
              ? 'accent'
              : 'warning'
        }
      />

      <KpiCard
        label="Win rate"
        icon={Percent}
        value={
          metrics.winRate !== null ? (
            <AnimatedNumber
              value={metrics.winRate}
              format={(value) => fmt.percent(value, 1)}
              title={`${metrics.wonCount} of ${metrics.closedCount} closed deals won`}
            />
          ) : (
            '—'
          )
        }
        trend={
          <DeltaBadge
            value={metrics.winRateDelta}
            label={metrics.winRateDelta === null ? '' : fmt.points(metrics.winRateDelta)}
          />
        }
        context={
          <>
            {metrics.closedCount} {metrics.closedCount === 1 ? 'deal' : 'deals'} closed
          </>
        }
        footer={
          metrics.previousWinRate !== null
            ? `${fmt.percent(metrics.previousWinRate, 1)} previous period`
            : undefined
        }
      />

      <KpiCard
        label="Avg. deal size"
        icon={BarChart3}
        value={
          metrics.averageDealSize !== null ? (
            <AnimatedNumber
              value={metrics.averageDealSize}
              format={fmt.currency}
              title={`Exactly ${fmt.exact(metrics.averageDealSize)}`}
            />
          ) : (
            '—'
          )
        }
        trend={
          <DeltaBadge
            value={metrics.averageDealSizeDelta}
            label={
              metrics.averageDealSizeDelta === null
                ? ''
                : signedPercent(metrics.averageDealSizeDelta)
            }
          />
        }
        context={
          <>
            across {metrics.wonCount} won {metrics.wonCount === 1 ? 'deal' : 'deals'}
          </>
        }
        footer={
          metrics.previousAverageDealSize !== null
            ? `${fmt.currency(metrics.previousAverageDealSize)} previous period`
            : undefined
        }
      />

      <KpiCard
        label="Sales cycle"
        icon={Clock}
        value={
          metrics.salesCycle.average !== null ? (
            <AnimatedNumber
              value={metrics.salesCycle.average}
              format={(value) => `${fmt.number(value, 0)}d`}
              title={`Median ${fmt.number(metrics.salesCycle.median ?? 0, 0)} days across ${metrics.salesCycle.count} won deals`}
            />
          ) : (
            '—'
          )
        }
        trend={
          <DeltaBadge
            value={metrics.salesCycleDelta}
            higherIsBetter={false}
            threshold={1}
            label={
              metrics.salesCycleDelta === null
                ? ''
                : `${metrics.salesCycleDelta >= 0 ? '+' : ''}${fmt.number(metrics.salesCycleDelta, 0)}d`
            }
          />
        }
        context={
          metrics.salesCycle.median !== null ? (
            <>median {fmt.number(metrics.salesCycle.median, 0)} days</>
          ) : undefined
        }
        footer={
          metrics.previousSalesCycle.average !== null
            ? `${fmt.number(metrics.previousSalesCycle.average, 0)} days previous period`
            : undefined
        }
      />

      <KpiCard
        label="Pipeline coverage"
        icon={Compass}
        value={
          metrics.coverage === null ? (
            'Covered'
          ) : isCoverageAmple(metrics.coverage) ? (
            'Ample'
          ) : (
            <AnimatedNumber
              value={metrics.coverage}
              format={(value) => `${fmt.number(value, 1)}x`}
              title={`${fmt.exact(metrics.pipelineTotal)} open pipeline against ${fmt.exact(metrics.remainingTarget)} remaining`}
            />
          )
        }
        context={
          metrics.coverage === null ? (
            <>Target already covered by closed revenue</>
          ) : isCoverageAmple(metrics.coverage) ? (
            <>Only {fmt.currency(metrics.remainingTarget)} left to book</>
          ) : (
            <>{HEALTHY_COVERAGE}x is the healthy threshold</>
          )
        }
        // Pipeline is a snapshot of today, so there is no earlier figure to
        // compare it with. Saying so beats fabricating one.
        footer="Point in time, no history to compare"
      />
    </section>
  )
}
