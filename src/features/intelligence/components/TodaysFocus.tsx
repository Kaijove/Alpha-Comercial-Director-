import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import type { Insight } from '@/domain/intelligence/types'
import { CATEGORY_LABELS } from '@/domain/intelligence/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { SeverityBadge, categoryIcon, severityTone } from './InsightVisuals'

/**
 * Today's Focus.
 *
 * Used by both the Dashboard and the Intelligence page, reading the same
 * `Insight[]` from the same engine - which is what stops the two screens from
 * ever recommending different things on the same day.
 */
export function TodaysFocus({
  insights,
  onOpen,
  headerAction,
  description = 'The highest-priority signals from your pipeline, targets, team and activity.',
}: {
  insights: Insight[]
  onOpen?: (insight: Insight) => void
  headerAction?: React.ReactNode
  description?: string
}) {
  const fmt = useFormatters()

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Today's Focus"
          description={description}
          action={headerAction}
        />
      </div>

      {insights.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<CheckCircle2 className="size-4" />}
            title="Everything looks healthy"
            description="No significant commercial risks detected for this selection today."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {insights.map((insight) => {
            const tone = severityTone[insight.severity]
            const Icon = categoryIcon[insight.category]

            return (
              <li key={insight.id}>
                <div className="px-5 py-4 transition-colors duration-150 hover:bg-elevated sm:px-6">
                  <button
                    type="button"
                    onClick={() => onOpen?.(insight)}
                    disabled={!onOpen}
                    className="block w-full text-left disabled:cursor-default"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <SeverityBadge severity={insight.severity} />
                      <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.1em] text-ink-faint">
                        <Icon className="size-3" aria-hidden />
                        {CATEGORY_LABELS[insight.category]}
                      </span>
                      {insight.impact !== null ? (
                        <span className={cn('tnum ml-auto text-xs', tone.text)}>
                          {fmt.currency(insight.impact)}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-medium leading-snug text-ink">
                      {insight.title}
                    </p>
                    <p className="mt-1.5 text-body leading-relaxed text-ink-muted">
                      {insight.description}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                      <span className="text-ink-faint">Why it matters: </span>
                      {insight.reason}
                    </p>
                  </button>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="text-xs leading-relaxed text-ink-muted">
                      <span className="text-ink-faint">Recommended: </span>
                      {insight.recommendation}
                    </p>
                    {insight.action ? (
                      <Link
                        to={insight.action.to}
                        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-field border border-line bg-elevated px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                      >
                        {insight.action.label}
                        <ArrowRight className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
