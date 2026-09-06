import { Check, EyeOff, Inbox, RotateCcw, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type Insight,
  type InsightStatus,
} from '@/domain/intelligence/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { SeverityBadge, categoryIcon, severityTone, statusTone } from './InsightVisuals'

/**
 * The full, filtered list of signals.
 *
 * Status actions live on the row so a director can clear the list without
 * opening every item; none of them touch the deal, customer or rep behind the
 * insight.
 */
export function InsightList({
  insights,
  title,
  description,
  onOpen,
  onStatus,
  onReopen,
  emptyTitle = 'No insights match these filters',
  emptyDescription = 'Widen the filters, or clear them to see everything the engine produced.',
}: {
  insights: Insight[]
  title: string
  description?: string
  onOpen: (insight: Insight) => void
  onStatus: (id: string, status: InsightStatus) => void
  onReopen: (id: string) => void
  emptyTitle?: string
  emptyDescription?: string
}) {
  const fmt = useFormatters()

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader title={title} description={description} />
      </div>

      {insights.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<Inbox className="size-4" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {insights.map((insight) => {
            const tone = severityTone[insight.severity]
            const Icon = categoryIcon[insight.category]
            const closed =
              insight.status === 'resolved' || insight.status === 'dismissed'

            return (
              <li
                key={insight.id}
                className={cn(
                  'transition-colors duration-150 hover:bg-elevated',
                  closed && 'opacity-55',
                )}
              >
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
                  <button
                    type="button"
                    onClick={() => onOpen(insight)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <SeverityBadge severity={insight.severity} />
                      <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.1em] text-ink-faint">
                        <Icon className="size-3" aria-hidden />
                        {CATEGORY_LABELS[insight.category]}
                      </span>
                      <span className="tnum text-2xs text-ink-faint">
                        Priority {insight.priorityScore}
                      </span>
                      {insight.status !== 'new' ? (
                        <span
                          className={cn(
                            'text-2xs uppercase tracking-[0.1em]',
                            statusTone[insight.status],
                          )}
                        >
                          {STATUS_LABELS[insight.status]}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-medium leading-snug text-ink">
                      {insight.title}
                    </p>
                    <p className="mt-1.5 text-body leading-relaxed text-ink-muted">
                      {insight.description}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-faint">
                      {insight.entityName ?? 'Company-wide'}
                      {insight.impact !== null ? (
                        <>
                          <span className="mx-1.5" aria-hidden>
                            ·
                          </span>
                          <span className={cn('tnum', tone.text)}>
                            {fmt.currency(insight.impact)}
                          </span>
                        </>
                      ) : null}
                      <span className="mx-1.5" aria-hidden>
                        ·
                      </span>
                      {fmt.shortDate(insight.createdAt)}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-1 sm:pt-1">
                    {closed ? (
                      <button
                        type="button"
                        onClick={() => onReopen(insight.id)}
                        title="Reopen this insight"
                        className="inline-flex items-center gap-1.5 rounded-field px-2 py-1.5 text-xs text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
                      >
                        <RotateCcw className="size-3" />
                        Reopen
                      </button>
                    ) : (
                      <>
                        {insight.status === 'new' ? (
                          <button
                            type="button"
                            onClick={() => onStatus(insight.id, 'seen')}
                            title="Mark as seen"
                            className="rounded-field p-1.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink"
                          >
                            <EyeOff className="size-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onStatus(insight.id, 'resolved')}
                          title="Mark resolved"
                          className="rounded-field p-1.5 text-ink-faint transition-colors hover:bg-positive/10 hover:text-positive"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatus(insight.id, 'dismissed')}
                          title="Dismiss"
                          className="rounded-field p-1.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink-muted"
                        >
                          <X className="size-3.5" />
                        </button>
                      </>
                    )}
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
