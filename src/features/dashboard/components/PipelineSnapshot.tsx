import { STAGE_LABELS } from '@/domain/commerce'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFormatters } from '@/hooks/useFormatters'
import { Compass } from 'lucide-react'

/**
 * Pipeline at a glance: how much is in play and where it is sitting. The
 * stage-by-stage board lives on the Pipeline page; this is the executive read.
 */
export function PipelineSnapshot({ metrics }: { metrics: CommercialMetrics }) {
  const fmt = useFormatters()
  const maxStageValue = Math.max(1, ...metrics.stages.map((stage) => stage.value))

  if (metrics.openCount === 0) {
    return (
      <Panel>
        <PanelHeader title="Pipeline" />
        <EmptyState
          className="mt-6 border-0"
          icon={<Compass className="size-4" />}
          title="No open opportunities"
          description="Nothing is currently in play for this selection."
        />
      </Panel>
    )
  }

  return (
    <Panel className="flex flex-col">
      <PanelHeader title="Pipeline" />

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
        <div>
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">Total</dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {fmt.currency(metrics.pipelineTotal)}
          </dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">Weighted</dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {fmt.currency(metrics.weightedPipeline)}
          </dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">Open deals</dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {metrics.openCount}
          </dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">
            Closing in 7d
          </dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {metrics.closingNext7Days.length}
          </dd>
        </div>
      </dl>

      <div className="mt-7 space-y-3 border-t border-line pt-5">
        {metrics.stages.map((stage) => (
          <div key={stage.stage} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-ink-muted">{STAGE_LABELS[stage.stage]}</span>
              <span className="tnum text-ink-faint">
                {stage.count} · <span className="text-ink-subtle">{fmt.currency(stage.value)}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent/55 transition-[width] duration-700 ease-out-soft"
                style={{ width: `${(stage.value / maxStageValue) * 100}%` }}
              />
            </div>
          </div>
        ))}

        {/* Won closes the funnel. It is not pipeline, so it sits below a seam
            and is scoped to the selected period rather than to open deals. */}
        <div className="space-y-1.5 border-t border-line pt-3">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-positive">{STAGE_LABELS.won}</span>
            <span className="tnum text-ink-faint">
              {metrics.wonCount} ·{' '}
              <span className="text-ink-subtle">{fmt.currency(metrics.revenue)}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-positive/55 transition-[width] duration-700 ease-out-soft"
              style={{
                width: `${Math.min(100, (metrics.revenue / maxStageValue) * 100)}%`,
              }}
            />
          </div>
          <p className="text-2xs text-ink-faint">Closed in {metrics.period.label.toLowerCase()}</p>
        </div>
      </div>

      {metrics.coverage !== null ? (
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-subtle">
          Open pipeline covers{' '}
          <span className="tnum font-medium text-ink">{metrics.coverage.toFixed(1)}x</span> the{' '}
          {fmt.currency(metrics.remainingToTarget)} still needed this period.
        </p>
      ) : null}
    </Panel>
  )
}
