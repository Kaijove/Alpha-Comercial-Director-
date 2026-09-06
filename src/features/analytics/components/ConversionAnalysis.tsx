import { AlertTriangle, GitCompareArrows } from 'lucide-react'
import { STAGE_LABELS } from '@/domain/commerce'
import {
  SIGNIFICANT_CONVERSION_DROP,
  type StageConversion,
} from '@/domain/metrics/funnel'
import { DeltaBadge } from '@/components/composite/DeltaBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

/**
 * Stage-to-stage conversion with its change against the previous period.
 * A meaningful drop is called out explicitly rather than left for the reader
 * to spot in a column of numbers.
 */
export function ConversionAnalysis({ conversions }: { conversions: StageConversion[] }) {
  const fmt = useFormatters()
  const measurable = conversions.filter((conversion) => conversion.rate !== null)

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Conversion"
          description="How opportunities move from one stage to the next, compared with the previous period."
        />
      </div>

      {measurable.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<GitCompareArrows className="size-4" />}
            title="Not enough movement to measure conversion"
            description="No stage transitions were recorded in this range."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {conversions.map((conversion) => {
            const dropped =
              conversion.changePoints !== null &&
              conversion.changePoints <= -SIGNIFICANT_CONVERSION_DROP

            return (
              <li
                key={`${conversion.from}-${conversion.to}`}
                className={cn(
                  'flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors duration-150 hover:bg-elevated sm:px-6',
                  dropped && 'bg-negative/[0.04]',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 text-body">
                  {dropped ? (
                    <AlertTriangle className="size-3.5 shrink-0 text-negative" aria-hidden />
                  ) : null}
                  <span className="truncate text-ink">
                    {STAGE_LABELS[conversion.from]}
                    <span className="mx-1.5 text-ink-faint">to</span>
                    {STAGE_LABELS[conversion.to]}
                  </span>
                </div>

                <span className="tnum w-24 shrink-0 text-right text-xs text-ink-subtle">
                  {conversion.deals} of {conversion.entered}
                </span>

                <span
                  className={cn(
                    'tnum w-16 shrink-0 text-right text-sm font-semibold',
                    dropped ? 'text-negative' : 'text-ink',
                  )}
                >
                  {conversion.rate !== null ? fmt.percent(conversion.rate, 0) : '—'}
                </span>

                <span className="w-24 shrink-0 text-right">
                  <DeltaBadge
                    value={conversion.changePoints}
                    label={
                      conversion.changePoints === null
                        ? ''
                        : fmt.points(conversion.changePoints)
                    }
                    threshold={0.01}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
