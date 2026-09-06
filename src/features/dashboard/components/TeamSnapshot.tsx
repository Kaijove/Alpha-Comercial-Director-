import { Users } from 'lucide-react'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { repInitials } from '@/domain/workspace'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

/**
 * A compact read on the team. The full performance-management view is a later
 * phase; this only surfaces the ranking and the headline averages.
 */
export function TeamSnapshot({ metrics }: { metrics: CommercialMetrics }) {
  const fmt = useFormatters()

  const ranked = [...metrics.reps].sort((a, b) => b.revenue - a.revenue)
  const activeReps = ranked.filter((rep) => rep.revenue > 0 || rep.openCount > 0).length
  const topPerformer = ranked[0]
  const teamRevenue = ranked.reduce((total, rep) => total + rep.revenue, 0)
  const teamTarget = ranked.reduce((total, rep) => total + rep.target, 0)

  if (ranked.length === 0) {
    return (
      <Panel>
        <PanelHeader title="Sales team" />
        <EmptyState
          className="mt-6 border-0"
          icon={<Users className="size-4" />}
          title="No sales reps yet"
          description="Add your team in Settings to unlock per-rep performance."
        />
      </Panel>
    )
  }

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader title="Sales team" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 pb-5 sm:px-6">
        <div>
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">
            Team revenue
          </dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {fmt.currency(teamRevenue)}
          </dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">Attainment</dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {teamTarget > 0 ? fmt.percent(teamRevenue / teamTarget, 0) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">Active reps</dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {activeReps}
          </dd>
        </div>
        <div>
          {/* The company-wide rate, not an average of per-rep rates: with few
              closed deals an average of averages contradicts the KPI row. */}
          <dt className="text-2xs uppercase tracking-[0.1em] text-ink-subtle">Win rate</dt>
          <dd className="tnum mt-1 text-section font-semibold tracking-tight text-ink">
            {metrics.winRate !== null ? fmt.percent(metrics.winRate, 0) : '—'}
          </dd>
        </div>
      </dl>

      <ul className="divide-y divide-line border-t border-line">
        {ranked.slice(0, 5).map((rep, index) => {
          const attainment = rep.attainment ?? 0
          return (
            <li
              key={rep.owner.id}
              className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-elevated sm:px-6"
            >
              <span className="tnum w-4 shrink-0 text-xs text-ink-faint">{index + 1}</span>
              <Avatar
                initials={repInitials(rep.owner.name)}
                accent={rep.owner.accent}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{rep.owner.name}</span>
                <span className="block truncate text-2xs text-ink-faint">
                  {rep.winRate !== null
                    ? `${fmt.percent(rep.winRate, 0)} conversion`
                    : 'No closed deals'}
                </span>
              </span>
              <span className="tnum shrink-0 text-body font-medium text-ink">
                {fmt.currency(rep.revenue)}
              </span>
              <span
                className={cn(
                  'tnum w-12 shrink-0 text-right text-xs',
                  attainment >= 1
                    ? 'text-positive'
                    : attainment >= 0.8
                      ? 'text-ink-muted'
                      : 'text-warning',
                )}
              >
                {fmt.percent(attainment, 0)}
              </span>
            </li>
          )
        })}
      </ul>

      {topPerformer && topPerformer.revenue > 0 ? (
        <p className="border-t border-line px-5 py-4 text-xs leading-relaxed text-ink-subtle sm:px-6">
          Top performer this period is{' '}
          <span className="font-medium text-ink-muted">{topPerformer.owner.name}</span> with{' '}
          <span className="tnum">{fmt.currency(topPerformer.revenue)}</span>.
        </p>
      ) : null}
    </Panel>
  )
}
