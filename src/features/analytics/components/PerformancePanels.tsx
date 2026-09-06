import type { AnalyticsMetrics } from '@/domain/metrics/analyticsMetrics'
import { HEALTHY_COVERAGE } from '@/domain/health/commercialHealth'
import { isCoverageAmple } from '@/domain/metrics/primitives'
import { DeltaBadge } from '@/components/composite/DeltaBadge'
import { Panel } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

function PanelTitle({ children }: { children: string }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
      {children}
    </p>
  )
}

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'default'
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-body">
      <span className="text-ink-muted">{label}</span>
      <span
        className={cn(
          'tnum font-medium',
          tone === 'positive'
            ? 'text-positive'
            : tone === 'negative'
              ? 'text-negative'
              : 'text-ink',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** attainment = revenue / target, gap = revenue - target. Nothing else. */
export function RevenueVsTargetPanel({ metrics }: { metrics: AnalyticsMetrics }) {
  const fmt = useFormatters()
  const attainment = metrics.attainment ?? 0
  const ahead = metrics.gap >= 0

  return (
    <Panel className="flex flex-col">
      <PanelTitle>Revenue vs target</PanelTitle>

      <div className="mt-4 flex items-baseline gap-2.5">
        <p className="tnum text-metric font-semibold leading-none tracking-tight text-ink">
          {fmt.percent(attainment, 1)}
        </p>
        <span className="text-body text-ink-muted">attainment</span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out-soft',
            ahead ? 'bg-positive' : 'bg-accent',
          )}
          style={{ width: `${Math.min(100, Math.max(0, attainment * 100))}%` }}
        />
      </div>

      <div className="mt-5 space-y-2.5 border-t border-line pt-4">
        <Row label="Actual revenue" value={fmt.currency(metrics.revenue)} />
        <Row label="Target" value={fmt.currency(metrics.target)} />
        <Row
          label={ahead ? 'Above target' : 'Gap to target'}
          value={fmt.currency(Math.abs(metrics.gap))}
          tone={ahead ? 'positive' : 'negative'}
        />
      </div>
    </Panel>
  )
}

/** Growth is a pure comparison: current vs previous, absolute and relative. */
export function GrowthPanel({ metrics }: { metrics: AnalyticsMetrics }) {
  const fmt = useFormatters()

  return (
    <Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <PanelTitle>Growth</PanelTitle>
        <DeltaBadge
          value={metrics.growthRatio}
          label={
            metrics.growthRatio === null
              ? ''
              : `${metrics.growthRatio >= 0 ? '+' : ''}${fmt.number(metrics.growthRatio * 100, 1)}%`
          }
        />
      </div>

      <div className="mt-4 space-y-1">
        <p
          className={cn(
            'tnum text-metric font-semibold leading-none tracking-tight',
            metrics.growthAbsolute >= 0 ? 'text-positive' : 'text-negative',
          )}
        >
          {fmt.signed(metrics.growthAbsolute)}
        </p>
        <p className="text-body text-ink-muted">against the previous period</p>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-line pt-4">
        <Row label="Current period" value={fmt.currency(metrics.revenue)} />
        <Row label="Previous period" value={fmt.currency(metrics.previousRevenue)} />
        <Row
          label="Won deals"
          value={`${metrics.wonCount} of ${metrics.closedCount} closed`}
        />
      </div>
    </Panel>
  )
}

/** Coverage with the sentence that makes the ratio mean something. */
export function PipelineCoveragePanel({ metrics }: { metrics: AnalyticsMetrics }) {
  const fmt = useFormatters()
  const covered = metrics.coverage === null
  const ample = isCoverageAmple(metrics.coverage)
  const healthy = (metrics.coverage ?? 0) >= HEALTHY_COVERAGE

  return (
    <Panel className="flex flex-col">
      <PanelTitle>Pipeline coverage</PanelTitle>

      <div className="mt-4 flex items-baseline gap-2.5">
        <p
          className={cn(
            'tnum text-metric font-semibold leading-none tracking-tight',
            covered ? 'text-positive' : healthy ? 'text-ink' : 'text-warning',
          )}
        >
          {covered ? 'Covered' : ample ? 'Ample' : `${fmt.number(metrics.coverage as number, 1)}x`}
        </p>
        {!covered && !ample ? (
          <span className="text-body text-ink-muted">coverage</span>
        ) : null}
      </div>

      <p className="mt-3 text-body leading-relaxed text-ink-muted">
        {covered
          ? 'Closed revenue already covers the commitment for this window, so coverage no longer applies.'
          : ample
            ? `Only ${fmt.currency(metrics.remainingTarget)} is left to book in this window, so the coverage ratio no longer says anything useful. The full pipeline is worth ${fmt.currency(metrics.pipelineTotal)}.`
            : `Your open pipeline covers ${fmt.number(metrics.coverage as number, 1)}x the revenue still needed. Around ${HEALTHY_COVERAGE}x is considered healthy, because only a share of pipeline converts.`}
      </p>

      <div className="mt-5 space-y-2.5 border-t border-line pt-4">
        <Row label="Open pipeline" value={fmt.currency(metrics.pipelineTotal)} />
        <Row label="Weighted pipeline" value={fmt.currency(metrics.weightedPipeline)} />
        <Row label="Remaining target" value={fmt.currency(metrics.remainingTarget)} />
      </div>
    </Panel>
  )
}
