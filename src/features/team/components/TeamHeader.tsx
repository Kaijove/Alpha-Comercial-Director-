import { X } from 'lucide-react'
import {
  Coins,
  Compass,
  Percent,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { Owner } from '@/domain/commerce'
import { PERIOD_OPTIONS, type CalendarPeriodKey } from '@/domain/metrics/periods'
import {
  PERFORMANCE_LABELS,
  type PerformanceStatus,
} from '@/domain/team/teamPerformanceEngine'
import { AnimatedNumber } from '@/components/composite/AnimatedNumber'
import { KpiCard } from '@/components/composite/KpiCard'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { controlBase, controlTone } from '@/components/ui/Field'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import type { TeamFilterState } from '../useTeamData'

export interface TeamHeaderStats {
  revenue: number
  teamTarget: number
  attainment: number | null
  pipeline: number
  winRate: number | null
  activeReps: number
  totalReps: number
  quotaGap: boolean
  commitment: number
  openCount: number
}

export function TeamKpis({ stats }: { stats: TeamHeaderStats }) {
  const fmt = useFormatters()

  return (
    <div className="space-y-3">
      <section
        aria-label="Team indicators"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <KpiCard
          label="Total revenue"
          icon={Coins}
          value={
            <AnimatedNumber
              value={stats.revenue}
              format={fmt.currency}
              title={`Exactly ${fmt.exact(stats.revenue)}`}
            />
          }
          context="Won by the team this period"
        />
        <KpiCard
          label="Team target"
          icon={Target}
          value={
            <AnimatedNumber
              value={stats.teamTarget}
              format={fmt.currency}
              title={`Sum of the individual quotas: ${fmt.exact(stats.teamTarget)}`}
            />
          }
          context="Sum of the individual quotas"
        />
        <KpiCard
          label="Target attainment"
          icon={TrendingUp}
          value={
            stats.attainment !== null ? (
              <AnimatedNumber
                value={stats.attainment}
                format={(value) => fmt.percent(value, 1)}
              />
            ) : (
              '—'
            )
          }
          context={<>of {fmt.currency(stats.teamTarget)}</>}
          progress={stats.attainment}
          progressTone={
            (stats.attainment ?? 0) >= 1
              ? 'positive'
              : (stats.attainment ?? 0) >= 0.8
                ? 'accent'
                : 'warning'
          }
        />
        <KpiCard
          label="Open pipeline"
          icon={Compass}
          value={
            <AnimatedNumber
              value={stats.pipeline}
              format={fmt.currency}
              title={`Exactly ${fmt.exact(stats.pipeline)}`}
            />
          }
          context={
            <>
              {stats.openCount} open{' '}
              {stats.openCount === 1 ? 'opportunity' : 'opportunities'}
            </>
          }
        />
        <KpiCard
          label="Average win rate"
          icon={Percent}
          value={
            stats.winRate !== null ? (
              <AnimatedNumber
                value={stats.winRate}
                format={(value) => fmt.percent(value, 1)}
              />
            ) : (
              '—'
            )
          }
          context="Across every deal closed this period"
        />
        <KpiCard
          label="Active sales reps"
          icon={Users}
          value={
            <AnimatedNumber
              value={stats.activeReps}
              format={(value) => fmt.number(value, 0)}
            />
          }
          context={
            stats.totalReps === stats.activeReps
              ? 'All reps have revenue or open pipeline'
              : `of ${stats.totalReps} on the roster`
          }
        />
      </section>

      {stats.quotaGap ? (
        <p className="px-1 text-xs text-ink-faint">
          Individual quotas add up to{' '}
          <span className="tnum text-ink-subtle">{fmt.currency(stats.teamTarget)}</span>{' '}
          against a company commitment of{' '}
          <span className="tnum text-ink-subtle">{fmt.currency(stats.commitment)}</span> for
          this period.
        </p>
      ) : null}
    </div>
  )
}

const STATUS_OPTIONS: { value: PerformanceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'on-track', label: PERFORMANCE_LABELS['on-track'] },
  { value: 'attention', label: PERFORMANCE_LABELS.attention },
  { value: 'at-risk', label: PERFORMANCE_LABELS['at-risk'] },
  { value: 'no-data', label: PERFORMANCE_LABELS['no-data'] },
]

export function TeamFilters({
  filters,
  onChange,
  onClear,
  owners,
  regions,
}: {
  filters: TeamFilterState
  onChange: (next: TeamFilterState) => void
  onClear: () => void
  owners: Owner[]
  regions: string[]
}) {
  const control = cn(controlBase, controlTone(false), 'h-9 appearance-none pr-8 text-body')
  const active =
    (filters.ownerId ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.region ? 1 : 0)

  return (
    <div className="flex flex-wrap items-center gap-3 border-y border-line py-3">
      <SegmentedControl
        value={filters.period}
        onChange={(period: CalendarPeriodKey) => onChange({ ...filters, period })}
        options={PERIOD_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
      />

      {owners.length > 1 ? (
        <select
          aria-label="Filter by sales rep"
          value={filters.ownerId ?? ''}
          onChange={(event) => onChange({ ...filters, ownerId: event.target.value || null })}
          className={cn(control, 'w-[180px]', !filters.ownerId && 'text-ink-muted')}
        >
          <option value="">All sales reps</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id} className="bg-elevated text-ink">
              {owner.name}
            </option>
          ))}
        </select>
      ) : null}

      <select
        aria-label="Filter by performance status"
        value={filters.status}
        onChange={(event) =>
          onChange({ ...filters, status: event.target.value as TeamFilterState['status'] })
        }
        className={cn(control, 'w-[150px]', filters.status === 'all' && 'text-ink-muted')}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-elevated text-ink">
            {option.label}
          </option>
        ))}
      </select>

      {/* Only offered when reps actually carry a region. */}
      {regions.length > 0 ? (
        <select
          aria-label="Filter by region"
          value={filters.region ?? ''}
          onChange={(event) => onChange({ ...filters, region: event.target.value || null })}
          className={cn(control, 'w-[150px]', !filters.region && 'text-ink-muted')}
        >
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region} value={region} className="bg-elevated text-ink">
              {region}
            </option>
          ))}
        </select>
      ) : null}

      {active > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-field px-2 py-1.5 text-xs text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
        >
          <X className="size-3" />
          Clear filters
        </button>
      ) : null}
    </div>
  )
}
