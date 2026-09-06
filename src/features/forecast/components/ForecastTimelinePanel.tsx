import { TriangleAlert } from 'lucide-react'
import type { ForecastTimeline } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

/**
 * When the forecast is expected to arrive.
 *
 * The shape matters as much as the total: revenue stacked into the last days of
 * a period carries an execution risk that the same number spread evenly does
 * not, and the panel says so rather than leaving it to be discovered.
 */
export function ForecastTimelinePanel({ timeline }: { timeline: ForecastTimeline }) {
  const fmt = useFormatters()
  const peak = Math.max(...timeline.buckets.map((bucket) => bucket.value), 1)

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Expected Closing Timeline"
        description="Forecast revenue by when the deals behind it are due."
        action={
          timeline.backLoaded ? (
            <Badge tone="warning">
              <TriangleAlert className="size-3" aria-hidden />
              Back-loaded
            </Badge>
          ) : null
        }
      />

      <ul className="mt-6 space-y-4">
        {timeline.buckets.map((bucket) => (
          <li key={bucket.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={cn(
                  'text-body',
                  bucket.key === 'overdue' ? 'text-warning' : 'text-ink-muted',
                )}
              >
                {bucket.label}
                <span className="ml-2 text-xs text-ink-faint">
                  {bucket.dealCount} {bucket.dealCount === 1 ? 'deal' : 'deals'}
                </span>
              </span>
              <span className="tnum shrink-0 text-body text-ink">
                {fmt.currency(bucket.value)}
                <span className="ml-2 text-xs font-normal text-ink-faint">
                  {fmt.percent(bucket.share, 0)}
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  'h-full rounded-full',
                  bucket.key === 'overdue' ? 'bg-warning' : 'bg-accent',
                )}
                style={{ width: `${Math.max(0, Math.min(100, (bucket.value / peak) * 100))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p
        className={cn(
          'mt-6 border-t border-line pt-4 text-xs leading-relaxed',
          timeline.backLoaded ? 'text-warning' : 'text-ink-faint',
        )}
      >
        {timeline.summary}
      </p>
    </Panel>
  )
}
