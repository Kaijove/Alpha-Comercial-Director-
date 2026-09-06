import { GitCompareArrows } from 'lucide-react'
import type { TeamBenchmarks } from '@/domain/metrics/teamMetrics'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import type { RepRow } from '../useTeamData'

const MAX_COMPARE = 4

interface MetricRow {
  label: string
  value: (row: RepRow) => string
  /** Numeric value used to mark the best column. Null means not comparable. */
  rank: (row: RepRow) => number | null
  /** False when a lower number is better, as with the sales cycle. */
  higherIsBetter?: boolean
  benchmark: (benchmarks: TeamBenchmarks) => string
}

/**
 * Head-to-head comparison of two to four reps.
 *
 * The best figure in each row is marked, with the direction respected: a
 * shorter sales cycle wins, a longer one does not.
 */
export function RepComparison({
  rows,
  benchmarks,
  selected,
  onToggle,
}: {
  rows: RepRow[]
  benchmarks: TeamBenchmarks
  selected: string[]
  onToggle: (ownerId: string) => void
}) {
  const fmt = useFormatters()
  const chosen = rows.filter((row) => selected.includes(row.owner.id))

  const metrics: MetricRow[] = [
    {
      label: 'Revenue',
      value: (row) => fmt.currency(row.revenue),
      rank: (row) => row.revenue,
      benchmark: (b) => fmt.currency(b.revenue),
    },
    {
      label: 'Target',
      value: (row) => fmt.currency(row.target),
      rank: () => null,
      benchmark: () => '—',
    },
    {
      label: 'Attainment',
      value: (row) => (row.attainment !== null ? fmt.percent(row.attainment, 0) : '—'),
      rank: (row) => row.attainment,
      benchmark: (b) => (b.attainment !== null ? fmt.percent(b.attainment, 0) : '—'),
    },
    {
      label: 'Win rate',
      value: (row) => (row.winRate !== null ? fmt.percent(row.winRate, 0) : '—'),
      rank: (row) => row.winRate,
      benchmark: (b) => (b.winRate !== null ? fmt.percent(b.winRate, 0) : '—'),
    },
    {
      label: 'Avg. deal size',
      value: (row) =>
        row.averageDealSize !== null ? fmt.currency(row.averageDealSize) : '—',
      rank: (row) => row.averageDealSize,
      benchmark: (b) =>
        b.averageDealSize !== null ? fmt.currency(b.averageDealSize) : '—',
    },
    {
      label: 'Open pipeline',
      value: (row) => fmt.currency(row.pipeline),
      rank: (row) => row.pipeline,
      benchmark: (b) => fmt.currency(b.pipeline),
    },
    {
      label: 'Sales cycle',
      value: (row) =>
        row.salesCycle.average !== null
          ? `${fmt.number(row.salesCycle.average, 0)} days`
          : '—',
      rank: (row) => row.salesCycle.average,
      higherIsBetter: false,
      benchmark: (b) => (b.salesCycle !== null ? `${fmt.number(b.salesCycle, 0)} days` : '—'),
    },
    {
      label: 'Activities',
      value: (row) => `${row.activity.total}`,
      rank: () => null,
      benchmark: (b) => fmt.number(b.activity, 0),
    },
  ]

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Rep Comparison"
          description={`Select up to ${MAX_COMPARE} reps to compare side by side.`}
        />
        <div className="mt-4 flex flex-wrap gap-1.5">
          {rows.map((row) => {
            const on = selected.includes(row.owner.id)
            const full = !on && selected.length >= MAX_COMPARE
            return (
              <button
                key={row.owner.id}
                type="button"
                disabled={full}
                onClick={() => onToggle(row.owner.id)}
                aria-pressed={on}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors duration-150',
                  on
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-line bg-elevated text-ink-muted hover:border-line-strong hover:text-ink',
                  full && 'cursor-not-allowed opacity-40',
                )}
              >
                {row.owner.name}
              </button>
            )
          })}
        </div>
      </div>

      {chosen.length < 2 ? (
        <div className="px-5 pb-5 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<GitCompareArrows className="size-4" />}
            title="Select at least two reps"
            description="Pick two to four people above and their figures will line up side by side."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[560px] border-collapse text-body">
            <thead>
              <tr className="border-b border-line">
                <th
                  scope="col"
                  className="px-5 py-2.5 text-left text-2xs font-medium uppercase tracking-[0.1em] text-ink-subtle"
                >
                  Metric
                </th>
                {chosen.map((row) => (
                  <th
                    key={row.owner.id}
                    scope="col"
                    className="px-3 py-2.5 text-right text-2xs font-medium uppercase tracking-[0.1em] text-ink"
                  >
                    {row.owner.name}
                  </th>
                ))}
                <th
                  scope="col"
                  className="px-5 py-2.5 text-right text-2xs font-medium uppercase tracking-[0.1em] text-ink-subtle"
                >
                  Team avg.
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const values = chosen.map((row) => metric.rank(row))
                const comparable = values.filter(
                  (value): value is number => value !== null,
                )
                const best =
                  comparable.length > 1
                    ? metric.higherIsBetter === false
                      ? Math.min(...comparable)
                      : Math.max(...comparable)
                    : null

                return (
                  <tr
                    key={metric.label}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className="px-5 py-3 text-ink-muted">{metric.label}</td>
                    {chosen.map((row, index) => {
                      const isBest = best !== null && values[index] === best
                      return (
                        <td
                          key={row.owner.id}
                          className={cn(
                            'tnum px-3 py-3 text-right',
                            isBest ? 'font-medium text-positive' : 'text-ink',
                          )}
                        >
                          {metric.value(row)}
                        </td>
                      )
                    })}
                    <td className="tnum px-5 py-3 text-right text-ink-faint">
                      {metric.benchmark(benchmarks)}
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
