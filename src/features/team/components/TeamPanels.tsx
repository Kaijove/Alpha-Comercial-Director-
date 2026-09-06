import { AlertTriangle, CheckCircle2, Compass, Percent } from 'lucide-react'
import type { TeamBenchmarks } from '@/domain/metrics/teamMetrics'
import { PERFORMANCE_LABELS } from '@/domain/team/teamPerformanceEngine'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { repInitials } from '@/domain/workspace'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import type { RepRow } from '../useTeamData'

/** Reps whose status is Attention or At Risk, with the evidence behind it. */
export function NeedsAttention({
  rows,
  onOpen,
}: {
  rows: RepRow[]
  onOpen: (ownerId: string) => void
}) {
  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4">
        <PanelHeader
          title="Needs Attention"
          description="Reps whose figures put them below where they should be, and why."
        />
      </div>

      {rows.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            className="border-0"
            icon={<CheckCircle2 className="size-4" />}
            title="Nobody needs attention"
            description="Every rep in this selection is on track against their target, pipeline and conversion."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((row) => (
            <li key={row.owner.id}>
              <button
                type="button"
                onClick={() => onOpen(row.owner.id)}
                className="w-full px-5 py-3.5 text-left transition-colors duration-150 hover:bg-elevated"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar
                    initials={repInitials(row.owner.name)}
                    accent={row.owner.accent}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    {row.owner.name}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-medium',
                      row.performance.status === 'at-risk'
                        ? 'text-negative'
                        : 'text-warning',
                    )}
                  >
                    {PERFORMANCE_LABELS[row.performance.status]}
                  </span>
                </div>

                {row.reasons.length > 0 ? (
                  <ul className="mt-2 space-y-1 pl-[34px]">
                    {row.reasons.slice(0, 3).map((reason) => (
                      <li key={reason} className="text-xs text-ink-subtle">
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {row.performance.weakest ? (
                  <p className="mt-2 pl-[34px] text-xs leading-relaxed text-ink-muted">
                    {row.performance.weakest.detail}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/**
 * Top performers.
 *
 * Four separate categories on purpose: the highest earner is very often not the
 * best converter, and collapsing them into one winner hides that.
 */
export function TopPerformers({
  rows,
  onOpen,
}: {
  rows: RepRow[]
  onOpen: (ownerId: string) => void
}) {
  const fmt = useFormatters()

  const best = <K extends keyof RepRow>(key: K, minimum = 0) =>
    [...rows]
      .filter((row) => typeof row[key] === 'number' && (row[key] as number) > minimum)
      .sort((a, b) => (b[key] as number) - (a[key] as number))[0] ?? null

  const categories = [
    { label: 'Highest revenue', row: best('revenue'), format: (r: RepRow) => fmt.currency(r.revenue) },
    {
      label: 'Highest attainment',
      row: best('attainment'),
      format: (r: RepRow) => fmt.percent(r.attainment ?? 0, 0),
    },
    {
      label: 'Highest win rate',
      row: best('winRate'),
      format: (r: RepRow) => fmt.percent(r.winRate ?? 0, 0),
    },
    { label: 'Largest pipeline', row: best('pipeline'), format: (r: RepRow) => fmt.currency(r.pipeline) },
  ]

  const anything = categories.some((entry) => entry.row !== null)

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4">
        <PanelHeader
          title="Top Performers"
          description="The leader in each category. One rep can lead several, but rarely all of them."
        />
      </div>

      {!anything ? (
        <div className="px-5 pb-5">
          <EmptyState
            className="border-0"
            icon={<Percent className="size-4" />}
            title="Nothing to rank yet"
            description="No rep has revenue, pipeline or closed deals in this period."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {categories.map((entry) => (
            <li key={entry.label}>
              {entry.row ? (
                <button
                  type="button"
                  onClick={() => onOpen(entry.row!.owner.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-elevated"
                >
                  <span className="w-[132px] shrink-0 text-xs text-ink-subtle">
                    {entry.label}
                  </span>
                  <Avatar
                    initials={repInitials(entry.row.owner.name)}
                    accent={entry.row.owner.accent}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate text-body text-ink">
                    {entry.row.owner.name}
                  </span>
                  <span className="tnum shrink-0 text-body font-medium text-ink">
                    {entry.format(entry.row)}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3">
                  <span className="w-[132px] shrink-0 text-xs text-ink-subtle">
                    {entry.label}
                  </span>
                  <span className="text-body text-ink-faint">Not enough data</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** Pipeline volume per rep, with concentration flagged where it matters. */
export function PipelineByRep({
  rows,
  benchmarks,
  onOpen,
}: {
  rows: RepRow[]
  benchmarks: TeamBenchmarks
  onOpen: (ownerId: string) => void
}) {
  const fmt = useFormatters()
  const sorted = [...rows].sort((a, b) => b.pipeline - a.pipeline)
  const max = Math.max(1, ...sorted.map((row) => row.pipeline))

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4">
        <PanelHeader
          title="Pipeline by Sales Rep"
          description={`Team average ${fmt.currency(benchmarks.pipeline)} of open pipeline.`}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            className="border-0"
            icon={<Compass className="size-4" />}
            title="No pipeline to show"
            description="No rep in this selection has open opportunities."
          />
        </div>
      ) : (
        <ul className="space-y-4 border-t border-line px-5 py-5">
          {sorted.map((row) => {
            const concentrated = (row.concentration ?? 0) >= 0.4 && row.openCount >= 3

            return (
              <li key={row.owner.id}>
                <button
                  type="button"
                  onClick={() => onOpen(row.owner.id)}
                  className="block w-full space-y-1.5 text-left"
                >
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="truncate text-ink-muted">{row.owner.name}</span>
                    <span className="tnum shrink-0 text-ink-faint">
                      {row.openCount} open ·{' '}
                      <span className="text-ink-subtle">{fmt.currency(row.pipeline)}</span>
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent/55 transition-[width] duration-700 ease-out-soft"
                      style={{ width: `${(row.pipeline / max) * 100}%` }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-full bg-accent"
                      style={{ width: `${(row.weightedPipeline / max) * 100}%` }}
                      title={`${fmt.currency(row.weightedPipeline)} weighted`}
                    />
                  </div>
                  {concentrated ? (
                    <p className="flex items-center gap-1.5 text-2xs text-warning">
                      <AlertTriangle className="size-3" aria-hidden />
                      {fmt.percent(row.concentration ?? 0, 0)} of it sits in one deal
                    </p>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="border-t border-line px-5 py-3 text-2xs text-ink-faint">
        The solid bar is weighted pipeline; the lighter bar is face value.
      </p>
    </Panel>
  )
}

/** Win rate per rep against the team average, in percentage points. */
export function WinRateByRep({
  rows,
  benchmarks,
  onOpen,
}: {
  rows: RepRow[]
  benchmarks: TeamBenchmarks
  onOpen: (ownerId: string) => void
}) {
  const fmt = useFormatters()
  const measurable = rows.filter((row) => row.winRate !== null)
  const sorted = [...measurable].sort(
    (a, b) => (b.winRate as number) - (a.winRate as number),
  )
  const average = benchmarks.winRate

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4">
        <PanelHeader
          title="Win Rate by Rep"
          description={
            average !== null
              ? `Team average ${fmt.percent(average, 0)}. Differences are shown in percentage points.`
              : 'No closed deals in this period yet.'
          }
        />
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            className="border-0"
            icon={<Percent className="size-4" />}
            title="No closed deals in this period"
            description="Win rate needs closed deals before it means anything."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {sorted.map((row) => {
            const rate = row.winRate as number
            const diff = average !== null ? rate - average : null

            return (
              <li key={row.owner.id}>
                <button
                  type="button"
                  onClick={() => onOpen(row.owner.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-elevated"
                >
                  <span className="min-w-0 flex-1 truncate text-body text-ink-muted">
                    {row.owner.name}
                  </span>
                  <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-accent/60"
                      style={{ width: `${Math.min(100, rate * 100)}%` }}
                    />
                  </span>
                  <span className="tnum w-12 shrink-0 text-right text-body font-medium text-ink">
                    {fmt.percent(rate, 0)}
                  </span>
                  <span
                    className={cn(
                      'tnum w-20 shrink-0 text-right text-xs',
                      diff === null
                        ? 'text-ink-faint'
                        : diff >= 0
                          ? 'text-positive'
                          : 'text-negative',
                    )}
                  >
                    {diff === null
                      ? '—'
                      : `${diff >= 0 ? '+' : ''}${fmt.number(diff * 100, 1)} pp`}
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
