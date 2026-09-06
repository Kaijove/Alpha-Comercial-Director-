import { BarChart3, Coins, Compass, Percent, Target } from 'lucide-react'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { AnimatedNumber } from '@/components/composite/AnimatedNumber'
import { DeltaBadge } from '@/components/composite/DeltaBadge'
import { useFormatters } from '@/hooks/useFormatters'
import { KpiCard } from '@/components/composite/KpiCard'

/**
 * The executive KPI row.
 *
 * Every figure comes from the same metrics snapshot, so the tiles can never
 * contradict each other or the widgets below.
 */
export function KpiRow({ metrics }: { metrics: CommercialMetrics }) {
  const fmt = useFormatters()
  const forecast = metrics.forecast

  return (
    <section
      aria-label="Key performance indicators"
      className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
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
            value={metrics.revenueDelta}
            label={
              metrics.revenueDelta === null
                ? ''
                : `${metrics.revenueDelta >= 0 ? '+' : ''}${fmt.number(metrics.revenueDelta * 100, 1)}%`
            }
          />
        }
        context={
          <>
            of <span className="tnum">{fmt.currency(metrics.target)}</span> target
          </>
        }
        footer={
          metrics.attainment !== null
            ? `${fmt.percent(metrics.attainment, 1)} attainment`
            : undefined
        }
        progress={metrics.attainment}
        progressTone={
          (metrics.pace ?? 1) >= 1 ? 'positive' : (metrics.pace ?? 1) >= 0.95 ? 'accent' : 'warning'
        }
      />

      <KpiCard
        label="Forecast"
        icon={BarChart3}
        value={
          <AnimatedNumber
            value={forecast.value}
            format={fmt.currency}
            title={`${fmt.exact(forecast.closedRevenue)} already won + ${fmt.exact(forecast.expectedFromPipeline)} weighted pipeline closing in this period`}
          />
        }
        trend={
          <DeltaBadge
            value={forecast.gap}
            label={`${forecast.gap >= 0 ? '+' : '-'}${fmt.currency(Math.abs(forecast.gap))}`}
            threshold={metrics.target * 0.005}
          />
        }
        context={
          <>
            of <span className="tnum">{fmt.currency(metrics.target)}</span> target
          </>
        }
        footer={
          forecast.attainment !== null
            ? `${fmt.percent(forecast.attainment, 1)} forecast attainment`
            : undefined
        }
        progress={forecast.attainment}
        progressTone={forecast.gap >= 0 ? 'positive' : 'warning'}
      />

      <KpiCard
        label="Pipeline"
        icon={Compass}
        value={
          <AnimatedNumber
            value={metrics.pipelineTotal}
            format={fmt.currency}
            title={`Exactly ${fmt.exact(metrics.pipelineTotal)} across ${metrics.openCount} open opportunities`}
          />
        }
        context={
          <>
            <span className="tnum">{metrics.openCount}</span> open{' '}
            {metrics.openCount === 1 ? 'opportunity' : 'opportunities'}
          </>
        }
        footer={`${fmt.currency(metrics.weightedPipeline)} weighted`}
      />

      <KpiCard
        label="Conversion"
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
            threshold={0.005}
          />
        }
        context={
          <>
            <span className="tnum">{metrics.closedCount}</span>{' '}
            {metrics.closedCount === 1 ? 'deal' : 'deals'} closed this period
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
        icon={Target}
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
                : `${metrics.averageDealSizeDelta >= 0 ? '+' : ''}${fmt.number(metrics.averageDealSizeDelta * 100, 1)}%`
            }
          />
        }
        context={
          <>
            across <span className="tnum">{metrics.wonCount}</span> won{' '}
            {metrics.wonCount === 1 ? 'deal' : 'deals'}
          </>
        }
        footer={
          metrics.previousAverageDealSize !== null
            ? `${fmt.currency(metrics.previousAverageDealSize)} previous period`
            : undefined
        }
      />
    </section>
  )
}
