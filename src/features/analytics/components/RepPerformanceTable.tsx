import { Users } from 'lucide-react'
import type { RepMetrics } from '@/domain/metrics/teamMetrics'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SortHeader } from '@/components/composite/SortHeader'
import { repInitials } from '@/domain/workspace'
import { useFormatters } from '@/hooks/useFormatters'
import { useSortable } from '@/hooks/useSortable'
import { cn } from '@/lib/cn'

type Column = 'name' | 'revenue' | 'attainment' | 'winRate' | 'dealSize' | 'pipeline'

/**
 * Per-rep performance, computed by the shared `computeRepMetrics` so these rows
 * match the team snapshot on the dashboard exactly. The full team module lives
 * on the Team page; this is the analytical read of the same numbers.
 */
export function RepPerformanceTable({ reps }: { reps: RepMetrics[] }) {
  const fmt = useFormatters()

  const { sorted, sort, toggle } = useSortable<RepMetrics, Column>(
    reps,
    {
      name: (rep) => rep.owner.name,
      revenue: (rep) => rep.revenue,
      attainment: (rep) => rep.attainment,
      winRate: (rep) => rep.winRate,
      dealSize: (rep) => rep.averageDealSize,
      pipeline: (rep) => rep.pipeline,
    },
    { key: 'revenue', direction: 'desc' },
  )

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Sales by Representative"
          description="Sort by any column to see who is driving the period."
        />
      </div>

      {reps.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<Users className="size-4" />}
            title="No sales reps yet"
            description="Add your team in Settings to break performance down by person."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] border-collapse text-body">
            <thead>
              <tr className="border-b border-line">
                <SortHeader
                  label="Sales rep"
                  columnKey="name"
                  align="left"
                  active={sort.key === 'name'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-5 py-2.5 sm:px-6"
                />
                <SortHeader
                  label="Revenue"
                  columnKey="revenue"
                  active={sort.key === 'revenue'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right text-2xs font-medium uppercase tracking-[0.1em] text-ink-subtle"
                >
                  Target
                </th>
                <SortHeader
                  label="Attainment"
                  columnKey="attainment"
                  active={sort.key === 'attainment'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Win rate"
                  columnKey="winRate"
                  active={sort.key === 'winRate'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Avg. deal"
                  columnKey="dealSize"
                  active={sort.key === 'dealSize'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Open pipeline"
                  columnKey="pipeline"
                  active={sort.key === 'pipeline'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-5 py-2.5 sm:px-6"
                />
              </tr>
            </thead>
            <tbody>
              {sorted.map((rep) => {
                const attainment = rep.attainment ?? 0
                return (
                  <tr
                    key={rep.owner.id}
                    className="border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-elevated"
                  >
                    <td className="px-5 py-3 sm:px-6">
                      <span className="flex items-center gap-2.5">
                        <Avatar
                          initials={repInitials(rep.owner.name)}
                          accent={rep.owner.accent}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-ink">{rep.owner.name}</span>
                          <span className="block truncate text-2xs text-ink-faint">
                            {rep.owner.role}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="tnum px-3 py-3 text-right font-medium text-ink">
                      {fmt.currency(rep.revenue)}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink-subtle">
                      {fmt.currency(rep.target)}
                    </td>
                    <td
                      className={cn(
                        'tnum px-3 py-3 text-right font-medium',
                        attainment >= 1
                          ? 'text-positive'
                          : attainment >= 0.8
                            ? 'text-ink-muted'
                            : 'text-warning',
                      )}
                    >
                      {fmt.percent(attainment, 0)}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink-muted">
                      {rep.winRate !== null ? fmt.percent(rep.winRate, 0) : '—'}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink-muted">
                      {rep.averageDealSize !== null
                        ? fmt.currency(rep.averageDealSize)
                        : '—'}
                    </td>
                    <td className="tnum px-5 py-3 text-right text-ink-muted sm:px-6">
                      {fmt.currency(rep.pipeline)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
