import { ArrowDownRight, ArrowUpRight, Info, Sparkle } from 'lucide-react'
import type { InsightTone, PerformanceInsight } from '@/domain/insights/analyticsEngine'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { cn } from '@/lib/cn'

const toneStyles: Record<
  InsightTone,
  { icon: typeof Info; text: string; ring: string }
> = {
  positive: { icon: ArrowUpRight, text: 'text-positive', ring: 'bg-positive/12' },
  negative: { icon: ArrowDownRight, text: 'text-negative', ring: 'bg-negative/12' },
  neutral: { icon: Info, text: 'text-ink-muted', ring: 'bg-raised' },
}

/**
 * Performance Insights.
 *
 * Produced by `analyticsEngine`, a set of deterministic rules over the same
 * figures shown elsewhere on this page. Every sentence can be checked against a
 * number the reader can already see.
 */
export function PerformanceInsights({ insights }: { insights: PerformanceInsight[] }) {
  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Performance Insights"
          description="Derived from the figures on this page by a fixed set of rules."
        />
      </div>

      {insights.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<Sparkle className="size-4" />}
            title="Nothing stands out in this period"
            description="No metric moved far enough from the previous period to be worth calling out."
          />
        </div>
      ) : (
        <ul className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
          {insights.map((insight) => {
            const tone = toneStyles[insight.tone]
            const Icon = tone.icon

            return (
              <li
                key={insight.id}
                className="bg-surface p-5 transition-colors duration-150 hover:bg-elevated"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full',
                      tone.ring,
                      tone.text,
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body font-medium leading-snug text-ink">
                      {insight.title}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                      {insight.detail}
                    </p>
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
