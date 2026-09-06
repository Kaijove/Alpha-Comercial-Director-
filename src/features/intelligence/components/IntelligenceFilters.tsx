import { Search, X } from 'lucide-react'
import { PERIOD_OPTIONS, type CalendarPeriodKey } from '@/domain/metrics/periods'
import { CATEGORY_LABELS, type InsightCategory } from '@/domain/intelligence/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { controlBase, controlTone } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

export type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low'
export type KindFilter = 'all' | 'risk' | 'opportunity' | 'performance' | 'anomaly'
export type StatusFilter = 'unresolved' | 'all' | 'new' | 'resolved' | 'dismissed'

export interface IntelligenceFilterState {
  period: CalendarPeriodKey
  severity: SeverityFilter
  kind: KindFilter
  status: StatusFilter
  category: InsightCategory | 'all'
  search: string
}

export const EMPTY_INTELLIGENCE_FILTERS: IntelligenceFilterState = {
  period: 'mtd',
  severity: 'all',
  kind: 'all',
  status: 'unresolved',
  category: 'all',
  search: '',
}

const SEVERITIES: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const KINDS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'risk', label: 'Risks' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'performance', label: 'Performance' },
  { value: 'anomaly', label: 'Anomalies' },
]

const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'all', label: 'Any status' },
  { value: 'new', label: 'New only' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
]

export function activeIntelligenceFilters(filters: IntelligenceFilterState): number {
  let count = 0
  if (filters.severity !== 'all') count += 1
  if (filters.kind !== 'all') count += 1
  if (filters.status !== 'unresolved') count += 1
  if (filters.category !== 'all') count += 1
  if (filters.search.trim()) count += 1
  return count
}

/** Every control here re-scopes the insight list, the feed and the counts. */
export function IntelligenceFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: IntelligenceFilterState
  onChange: (next: IntelligenceFilterState) => void
  onClear: () => void
}) {
  const control = cn(controlBase, controlTone(false), 'h-9 appearance-none pr-8 text-body')
  const active = activeIntelligenceFilters(filters)

  return (
    <div className="space-y-3 border-y border-line py-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={filters.period}
          onChange={(period: CalendarPeriodKey) => onChange({ ...filters, period })}
          options={PERIOD_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />

        <div className="relative min-w-[190px] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            aria-label="Search insights"
            placeholder="Search insights..."
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            className={cn(controlBase, controlTone(false), 'h-9 w-full pl-9 text-body')}
          />
        </div>

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

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={filters.severity}
          onChange={(severity: SeverityFilter) => onChange({ ...filters, severity })}
          options={SEVERITIES}
        />

        <select
          aria-label="Filter by signal kind"
          value={filters.kind}
          onChange={(event) =>
            onChange({ ...filters, kind: event.target.value as KindFilter })
          }
          className={cn(control, 'w-[160px]', filters.kind === 'all' && 'text-ink-muted')}
        >
          {KINDS.map((option) => (
            <option key={option.value} value={option.value} className="bg-elevated text-ink">
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(event) =>
            onChange({
              ...filters,
              category: event.target.value as InsightCategory | 'all',
            })
          }
          className={cn(
            control,
            'w-[150px]',
            filters.category === 'all' && 'text-ink-muted',
          )}
        >
          <option value="all">All categories</option>
          {(Object.keys(CATEGORY_LABELS) as InsightCategory[]).map((category) => (
            <option key={category} value={category} className="bg-elevated text-ink">
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as StatusFilter })
          }
          className={cn(control, 'w-[150px]')}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value} className="bg-elevated text-ink">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
