import { Users } from 'lucide-react'
import { PERFORMANCE_LABELS, type PerformanceStatus } from '@/domain/team/teamPerformanceEngine'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SortHeader } from '@/components/composite/SortHeader'
import { repInitials } from '@/domain/workspace'
import { useFormatters } from '@/hooks/useFormatters'
import { useSortable } from '@/hooks/useSortable'
import { cn } from '@/lib/cn'
import { daysSince } from '@/domain/commerce'
import type { RepRow } from '../useTeamData'

type Column =
  | 'name'
  | 'revenue'
  | 'target'
  | 'attainment'
  | 'pipeline'
  | 'weighted'
  | 'winRate'
  | 'dealSize'
  | 'won'
  | 'open'
  | 'activity'
  | 'status'

const statusTone: Record<PerformanceStatus, string> = {
  'on-track': 'text-positive',
  attention: 'text-warning',
  'at-risk': 'text-negative',
  'no-data': 'text-ink-faint',
}

const statusDot: Record<PerformanceStatus, string> = {
  'on-track': 'bg-positive',
  attention: 'bg-warning',
  'at-risk': 'bg-negative',
  'no-data': 'bg-ink-faint',
}

/**
 * Team overview and performance ranking in one table.
 *
 * The rank number follows whatever column is sorted, so it always means "first
 * by this measure" rather than being a fixed decoration.
 */
export function TeamRanking({
  rows,
  now,
  onOpen,
}: {
  rows: RepRow[]
  now: Date
  onOpen: (ownerId: string) => void
}) {
  const fmt = useFormatters()

  const { sorted, sort, toggle } = useSortable<RepRow, Column>(
    rows,
    {
      name: (row) => row.owner.name,
      revenue: (row) => row.revenue,
      target: (row) => row.target,
      attainment: (row) => row.attainment,
      pipeline: (row) => row.pipeline,
      weighted: (row) => row.weightedPipeline,
      winRate: (row) => row.winRate,
      dealSize: (row) => row.averageDealSize,
      won: (row) => row.wonCount,
      open: (row) => row.openCount,
      activity: (row) =>
        row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : null,
      status: (row) => -row.performance.score,
    },
    { key: 'revenue', direction: 'desc' },
  )

  if (rows.length === 0) {
    return (
      <Panel>
        <PanelHeader title="Performance Ranking" />
        <EmptyState
          className="mt-6 border-0"
          icon={<Users className="size-4" />}
          title="No sales reps match these filters"
          description="Clear the filters, or add reps to the roster to start measuring performance."
        />
      </Panel>
    )
  }

  return (
    <Panel flush>
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Performance Ranking"
          description="Sort by any column; the position follows the measure you choose."
        />
      </div>

      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[1180px] border-collapse text-body">
          <thead>
            <tr className="border-b border-line">
              <th
                scope="col"
                className="w-10 px-5 py-2.5 text-left text-2xs font-medium uppercase tracking-[0.1em] text-ink-subtle"
              >
                #
              </th>
              <SortHeader label="Sales rep" columnKey="name" align="left" active={sort.key === 'name'} direction={sort.direction} onSort={toggle} className="px-2 py-2.5" />
              <SortHeader label="Status" columnKey="status" align="left" active={sort.key === 'status'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Revenue" columnKey="revenue" active={sort.key === 'revenue'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Target" columnKey="target" active={sort.key === 'target'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Attain." columnKey="attainment" active={sort.key === 'attainment'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Pipeline" columnKey="pipeline" active={sort.key === 'pipeline'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Weighted" columnKey="weighted" active={sort.key === 'weighted'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Win rate" columnKey="winRate" active={sort.key === 'winRate'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Avg. deal" columnKey="dealSize" active={sort.key === 'dealSize'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Won" columnKey="won" active={sort.key === 'won'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Open" columnKey="open" active={sort.key === 'open'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Last activity" columnKey="activity" active={sort.key === 'activity'} direction={sort.direction} onSort={toggle} className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const attainment = row.attainment ?? 0
              const inactive = row.lastActivityAt
                ? daysSince(row.lastActivityAt, now)
                : null

              return (
                <tr
                  key={row.owner.id}
                  tabIndex={0}
                  onClick={() => onOpen(row.owner.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpen(row.owner.id)
                    }
                  }}
                  className="cursor-pointer border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-elevated focus-visible:bg-elevated"
                >
                  <td className="tnum px-5 py-3 text-ink-faint">{index + 1}</td>
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar
                        initials={repInitials(row.owner.name)}
                        accent={row.owner.accent}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{row.owner.name}</span>
                        <span className="block truncate text-2xs text-ink-faint">
                          {row.owner.role}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium',
                        statusTone[row.performance.status],
                      )}
                      title={row.performance.weakest?.detail}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          statusDot[row.performance.status],
                        )}
                        aria-hidden
                      />
                      {PERFORMANCE_LABELS[row.performance.status]}
                    </span>
                  </td>
                  <td className="tnum px-3 py-3 text-right font-medium text-ink">
                    {fmt.currency(row.revenue)}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">
                    {fmt.currency(row.target)}
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
                    {row.attainment !== null ? fmt.percent(row.attainment, 0) : '—'}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {fmt.currency(row.pipeline)}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {fmt.currency(row.weightedPipeline)}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {row.winRate !== null ? fmt.percent(row.winRate, 0) : '—'}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {row.averageDealSize !== null ? fmt.currency(row.averageDealSize) : '—'}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">{row.wonCount}</td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">{row.openCount}</td>
                  <td className="px-5 py-3 text-right text-ink-muted">
                    {inactive === null
                      ? 'No activity'
                      : inactive === 0
                        ? 'Today'
                        : `${inactive}d ago`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
