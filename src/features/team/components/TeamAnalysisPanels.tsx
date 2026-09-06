import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Lightbulb, TrendingUp } from 'lucide-react'
import type { CoachingSignal, CoachingTone } from '@/domain/team/coachingEngine'
import type { TeamBenchmarks } from '@/domain/metrics/teamMetrics'
import { ACTIVITY_BREAKDOWN } from '@/domain/metrics/teamMetrics'
import { ACTIVITY_LABELS } from '@/domain/commerce'
import { REP_SERIES_COLORS, type RepTrendPoint } from '@/domain/metrics/repTrend'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { CHART_COLORS, axisProps, gridProps } from '@/components/charts/chartTheme'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import type { RepRow } from '../useTeamData'

/** Revenue over time for the reps the director chooses to compare. */
export function PerformanceTrend({
  data,
  rows,
  selected,
  onToggle,
  showTarget,
}: {
  data: RepTrendPoint[]
  rows: RepRow[]
  selected: string[]
  onToggle: (ownerId: string) => void
  showTarget: boolean
}) {
  const fmt = useFormatters()
  const nameOf = (id: string) => rows.find((row) => row.owner.id === id)?.owner.name ?? id

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Performance Trend"
        description="Monthly revenue per rep. Select who to compare rather than drawing every line at once."
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        {rows.map((row, index) => {
          const on = selected.includes(row.owner.id)
          return (
            <button
              key={row.owner.id}
              type="button"
              onClick={() => onToggle(row.owner.id)}
              aria-pressed={on}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150',
                on
                  ? 'border-line-strong bg-raised text-ink'
                  : 'border-line bg-elevated text-ink-faint hover:text-ink-muted',
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: on
                    ? REP_SERIES_COLORS[index % REP_SERIES_COLORS.length]
                    : 'currentColor',
                  opacity: on ? 1 : 0.4,
                }}
                aria-hidden
              />
              {row.owner.name}
            </button>
          )
        })}
      </div>

      {selected.length === 0 ? (
        <EmptyState
          className="mt-6 border-0"
          icon={<TrendingUp className="size-4" />}
          title="Select a rep to compare"
          description="Pick up to a handful of reps above to draw their revenue over time."
        />
      ) : (
        <div className="-ml-2 mt-5 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} minTickGap={20} />
              <YAxis
                {...axisProps}
                width={68}
                tickFormatter={(value: number) => fmt.compact(value)}
              />
              <Tooltip
                cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
                content={<ChartTooltip format={(value) => fmt.exact(value)} />}
              />
              {selected.map((ownerId) => (
                <Line
                  key={ownerId}
                  type="monotone"
                  dataKey={ownerId}
                  name={nameOf(ownerId)}
                  stroke={REP_SERIES_COLORS[
                    rows.findIndex((row) => row.owner.id === ownerId) %
                      REP_SERIES_COLORS.length
                  ]}
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
              {showTarget ? (
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target pace"
                  stroke={CHART_COLORS.reference}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  )
}

/**
 * Activity, shown as context.
 *
 * Deliberately placed next to revenue and win rate without any claim that more
 * activity is better - that is the reader's judgement to make, not the table's.
 */
export function ActivityPerformance({
  rows,
  benchmarks,
  onOpen,
}: {
  rows: RepRow[]
  benchmarks: TeamBenchmarks
  onOpen: (ownerId: string) => void
}) {
  const fmt = useFormatters()
  const sorted = [...rows].sort((a, b) => b.activity.total - a.activity.total)
  const anyActivity = sorted.some((row) => row.activity.total > 0)

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Activity Performance"
          description="Logged activity alongside what it produced. More activity is not automatically better; read the three columns together."
        />
      </div>

      {!anyActivity ? (
        <div className="px-5 pb-5 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<Activity className="size-4" />}
            title="No activity recorded"
            description="No calls, meetings or emails were logged in this period."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] border-collapse text-body">
            <thead>
              <tr className="border-b border-line text-2xs uppercase tracking-[0.1em] text-ink-subtle">
                <th scope="col" className="px-5 py-2.5 text-left font-medium">
                  Sales rep
                </th>
                {ACTIVITY_BREAKDOWN.map((type) => (
                  <th key={type} scope="col" className="px-3 py-2.5 text-right font-medium">
                    {ACTIVITY_LABELS[type]}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Revenue
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                  Win rate
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.owner.id}
                  onClick={() => onOpen(row.owner.id)}
                  className="cursor-pointer border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-elevated"
                >
                  <td className="px-5 py-3 text-ink">{row.owner.name}</td>
                  {ACTIVITY_BREAKDOWN.map((type) => (
                    <td key={type} className="tnum px-3 py-3 text-right text-ink-muted">
                      {row.activity[type]}
                    </td>
                  ))}
                  <td
                    className={cn(
                      'tnum px-3 py-3 text-right font-medium',
                      row.activity.total > benchmarks.activity ? 'text-ink' : 'text-ink-muted',
                    )}
                  >
                    {row.activity.total}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {fmt.currency(row.revenue)}
                  </td>
                  <td className="tnum px-5 py-3 text-right text-ink-muted">
                    {row.winRate !== null ? fmt.percent(row.winRate, 0) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line text-xs text-ink-faint">
                <td className="px-5 py-2.5">Team average</td>
                <td colSpan={ACTIVITY_BREAKDOWN.length} />
                <td className="tnum px-3 py-2.5 text-right">
                  {fmt.number(benchmarks.activity, 0)}
                </td>
                <td className="tnum px-3 py-2.5 text-right">
                  {fmt.currency(benchmarks.revenue)}
                </td>
                <td className="tnum px-5 py-2.5 text-right">
                  {benchmarks.winRate !== null ? fmt.percent(benchmarks.winRate, 0) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Panel>
  )
}

const coachingTone: Record<CoachingTone, { text: string; ring: string }> = {
  strength: { text: 'text-positive', ring: 'bg-positive/12' },
  watch: { text: 'text-warning', ring: 'bg-warning/12' },
  risk: { text: 'text-negative', ring: 'bg-negative/12' },
}

/** Rule-based coaching signals. No model, and the copy never suggests one. */
export function CoachingSignals({
  signals,
  onOpen,
}: {
  signals: CoachingSignal[]
  onOpen: (ownerId: string) => void
}) {
  const [limit, setLimit] = useState(6)
  const visible = signals.slice(0, limit)

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Coaching Signals"
          description="Pairs of facts about a rep that are worth a conversation, produced by a fixed set of rules."
        />
      </div>

      {signals.length === 0 ? (
        <div className="px-5 pb-5 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<Lightbulb className="size-4" />}
            title="No coaching signals"
            description="No rep shows a combination of figures that a rule flags in this period."
          />
        </div>
      ) : (
        <>
          <ul className="grid gap-px border-t border-line bg-line sm:grid-cols-2">
            {visible.map((signal) => {
              const tone = coachingTone[signal.tone]
              return (
                <li key={signal.id} className="bg-surface">
                  <button
                    type="button"
                    onClick={() => onOpen(signal.ownerId)}
                    className="h-full w-full p-5 text-left transition-colors duration-150 hover:bg-elevated"
                  >
                    <span className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full',
                          tone.ring,
                          tone.text,
                        )}
                      >
                        <Lightbulb className="size-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-body font-medium leading-snug text-ink">
                          {signal.title}
                        </span>
                        <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">
                          {signal.detail}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {signals.length > limit ? (
            <button
              type="button"
              onClick={() => setLimit((current) => current + 6)}
              className="border-t border-line px-5 py-3 text-xs text-ink-subtle transition-colors hover:bg-elevated hover:text-ink"
            >
              Show {Math.min(6, signals.length - limit)} more of {signals.length}
            </button>
          ) : null}
        </>
      )}
    </Panel>
  )
}
