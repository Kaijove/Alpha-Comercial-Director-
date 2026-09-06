import { Filter } from 'lucide-react'
import { STAGE_LABELS } from '@/domain/commerce'
import type { FunnelStageStat } from '@/domain/metrics/funnel'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

/**
 * The funnel measured as a cohort: the opportunities that entered the funnel
 * inside the range, and how far each of them progressed. See `buildFunnel` for
 * why a per-stage flow count is the wrong measure here.
 */
export function SalesFunnel({
  funnel,
  windowDays,
  averageCycleDays,
  wonInPeriod,
}: {
  funnel: FunnelStageStat[]
  windowDays: number
  averageCycleDays: number | null
  /** Deals won inside the window, whenever they entered the funnel. */
  wonInPeriod: number
}) {
  const fmt = useFormatters()
  // A cohort younger than the sales cycle has not finished progressing, and
  // saying so is better than quietly reporting depressed late-stage rates.
  const cohortStillYoung =
    averageCycleDays !== null && windowDays < averageCycleDays * 1.5
  const top = funnel[0]?.entered ?? 0
  const cohortWon = funnel[funnel.length - 1]?.entered ?? 0
  const hasFlow = funnel.some((stage) => stage.entered > 0)

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Sales Funnel"
        description="Opportunities that entered the funnel in this period, and how far they progressed."
      />

      {hasFlow ? (
        <ol className="mt-6 space-y-4">
          {funnel.map((stage) => {
            const width = top > 0 ? Math.max(4, (stage.entered / top) * 100) : 0
            const isWon = stage.stage === 'won'

            return (
              <li key={stage.stage} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex items-baseline gap-2.5">
                    <span
                      className={cn(
                        'text-body font-medium',
                        isWon ? 'text-positive' : 'text-ink',
                      )}
                    >
                      {STAGE_LABELS[stage.stage]}
                    </span>
                    <span className="tnum text-xs text-ink-subtle">
                      {stage.entered}{' '}
                      {stage.entered === 1 ? 'opportunity' : 'opportunities'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="tnum text-body text-ink-muted">
                      {fmt.currency(stage.value)}
                    </span>
                    {stage.conversionFromPrevious !== null ? (
                      <span className="tnum w-16 text-right text-xs text-ink-faint">
                        {fmt.percent(stage.conversionFromPrevious, 0)} through
                      </span>
                    ) : (
                      <span className="w-16 text-right text-xs text-ink-faint">entry</span>
                    )}
                  </div>
                </div>

                <div className="h-7 overflow-hidden rounded-[6px] bg-line/60">
                  <div
                    className={cn(
                      'h-full rounded-[6px] transition-[width] duration-700 ease-out-soft',
                      isWon ? 'bg-positive/45' : 'bg-accent/45',
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyState
          className="mt-6 border-0"
          icon={<Filter className="size-4" />}
          title="No stage activity in this period"
          description="No opportunity entered a stage inside the selected range. Try a wider range."
        />
      )}
      {hasFlow && cohortWon !== wonInPeriod ? (
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
          These {cohortWon} wins are the ones that both entered the funnel and closed inside
          this period. {wonInPeriod} deals were won in total; the rest entered the funnel
          before it started.
        </p>
      ) : null}

      {hasFlow && cohortStillYoung ? (
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
          This window is shorter than the average sales cycle, so part of the cohort is
          still in play and the later stages are understated.
        </p>
      ) : null}
    </Panel>
  )
}
