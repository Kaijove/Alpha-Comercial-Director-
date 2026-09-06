import { BarChart3, Coins, Gauge, Minus, Percent, Target } from 'lucide-react'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { AnimatedNumber } from '@/components/composite/AnimatedNumber'
import { KpiCard } from '@/components/composite/KpiCard'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * The commercial outlook in six figures.
 *
 * Every one of them comes from the same forecast report the rest of the page
 * reads, so the strip can never contradict the panels underneath it.
 */
export function ForecastOverview({ metrics }: { metrics: CommercialMetrics }) {
  const fmt = useFormatters()
  const forecast = metrics.forecast
  const { gapDetail, probability, confidence } = forecast

  return (
    <section
      aria-label="Forecast overview"
      className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
    >
      <KpiCard
        label="Current revenue"
        icon={Coins}
        value={
          <AnimatedNumber
            value={metrics.revenue}
            format={fmt.currency}
            title={`Exactly ${fmt.exact(metrics.revenue)} won in ${metrics.period.label}`}
          />
        }
        context={
          metrics.attainment !== null
            ? `${fmt.percent(metrics.attainment, 1)} of target already booked`
            : 'No target set for this period'
        }
        progress={metrics.attainment}
        progressTone={(metrics.pace ?? 1) >= 1 ? 'positive' : 'warning'}
      />

      <KpiCard
        label="Target"
        icon={Target}
        value={
          <AnimatedNumber
            value={metrics.target}
            format={fmt.currency}
            title={`Exactly ${fmt.exact(metrics.target)}`}
          />
        }
        context={`${metrics.period.remainingDays} ${metrics.period.remainingDays === 1 ? 'day' : 'days'} left in ${metrics.period.label}`}
      />

      <KpiCard
        label="Base forecast"
        icon={BarChart3}
        value={
          <AnimatedNumber
            value={forecast.value}
            format={fmt.currency}
            title={`${fmt.exact(forecast.closedRevenue)} already closed + ${fmt.exact(forecast.expectedFromPipeline)} expected from open deals`}
          />
        }
        context={
          <>
            <span className="tnum">{fmt.currency(forecast.closedRevenue)}</span> closed +{' '}
            <span className="tnum">{fmt.currency(forecast.expectedFromPipeline)}</span> projected
          </>
        }
      />

      <KpiCard
        label="Forecast gap"
        icon={Minus}
        value={
          <AnimatedNumber
            value={gapDetail.amount}
            format={(value) => `${value >= 0 ? '+' : '−'}${fmt.currency(Math.abs(value))}`}
            title={`Exactly ${fmt.exact(gapDetail.amount)} against target`}
          />
        }
        context={gapDetail.summary}
      />

      <KpiCard
        label="Forecast attainment"
        icon={Percent}
        value={
          <AnimatedNumber
            value={forecast.attainment ?? 0}
            format={(value) => (forecast.attainment === null ? '—' : fmt.percent(value, 1))}
          />
        }
        context="Base forecast against the period target"
        progress={forecast.attainment}
        progressTone={gapDetail.amount >= 0 ? 'positive' : 'warning'}
      />

      <KpiCard
        label="Probability of target"
        icon={Gauge}
        value={<AnimatedNumber value={probability.score} format={(v) => `${Math.round(v)}%`} />}
        context={probability.summary}
        footer={`${confidence.label} · ${confidence.score}/100`}
        progress={probability.score / 100}
        progressTone={
          probability.score >= 70 ? 'positive' : probability.score >= 45 ? 'accent' : 'warning'
        }
      />
    </section>
  )
}
