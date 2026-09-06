import { History } from 'lucide-react'
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  type Insight,
} from '@/domain/intelligence/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { severityTone } from './InsightVisuals'

/**
 * The intelligence timeline.
 *
 * Ordered by the data event that produced each signal, not by generation time -
 * which would be identical for everything and tell the reader nothing. Kept
 * deliberately plain: an executive log, not a feed to scroll.
 */
export function IntelligenceFeed({
  insights,
  onOpen,
}: {
  insights: Insight[]
  onOpen: (insight: Insight) => void
}) {
  const fmt = useFormatters()

  const ordered = [...insights].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Intelligence Feed"
          description="Signals in the order the underlying events happened."
        />
      </div>

      {ordered.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<History className="size-4" />}
            title="Nothing to show yet"
            description="No signal matches the current filters."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-soft border-t border-line">
          {ordered.slice(0, 14).map((insight) => {
            const tone = severityTone[insight.severity]
            return (
              <li key={insight.id}>
                <button
                  type="button"
                  onClick={() => onOpen(insight)}
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors duration-150 hover:bg-elevated sm:px-6"
                >
                  <span className="tnum w-16 shrink-0 text-xs text-ink-faint">
                    {fmt.shortDate(insight.createdAt)}
                  </span>
                  <span
                    className={cn('size-1.5 shrink-0 rounded-full', tone.dot)}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'w-16 shrink-0 text-2xs uppercase tracking-[0.1em]',
                      tone.text,
                    )}
                  >
                    {SEVERITY_LABELS[insight.severity]}
                  </span>
                  <span className="hidden w-24 shrink-0 text-2xs uppercase tracking-[0.1em] text-ink-faint sm:block">
                    {CATEGORY_LABELS[insight.category]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body text-ink-muted">
                    {insight.title}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
