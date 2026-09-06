import { CalendarRange } from 'lucide-react'
import type { AnalyticsMetrics } from '@/domain/metrics/analyticsMetrics'
import { DeltaBadge } from '@/components/composite/DeltaBadge'
import { useFormatters } from '@/hooks/useFormatters'

export function AnalyticsHeader({ metrics }: { metrics: AnalyticsMetrics }) {
  const fmt = useFormatters()
  const { period } = metrics

  return (
    <header className="space-y-3">
      <div className="space-y-2">
        <h1 className="text-page font-semibold text-ink">
          Analytics
        </h1>
        <p className="text-sm text-ink-muted">
          Understand what is driving your commercial performance.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="size-3.5" aria-hidden />
          <span className="text-ink-subtle">
            {fmt.shortDate(period.start)} – {fmt.shortDate(period.end)}
          </span>
        </span>
        <span aria-hidden>/</span>
        <span>
          {period.days} {period.days === 1 ? 'day' : 'days'}
        </span>
        <span aria-hidden>/</span>
        <span>
          compared with {fmt.shortDate(period.previous.start)} –{' '}
          {fmt.shortDate(period.previous.end)}
        </span>
        <DeltaBadge
          value={metrics.growthRatio}
          label={
            metrics.growthRatio === null
              ? ''
              : `${metrics.growthRatio >= 0 ? '+' : ''}${fmt.number(metrics.growthRatio * 100, 1)}% revenue`
          }
        />
      </div>
    </header>
  )
}
