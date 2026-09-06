import { X } from 'lucide-react'
import type { Owner } from '@/domain/commerce'
import { PERIOD_OPTIONS, type CalendarPeriodKey } from '@/domain/metrics/periods'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { controlBase, controlTone } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

export interface DashboardFilterState {
  period: CalendarPeriodKey
  ownerId: string | null
}

/**
 * Global dashboard filters. Both of them actually re-scope every widget on the
 * page - there are no decorative controls here.
 */
export function DashboardFilters({
  value,
  onChange,
  owners,
}: {
  value: DashboardFilterState
  onChange: (next: DashboardFilterState) => void
  owners: Owner[]
}) {
  const activeCount = value.ownerId ? 1 : 0

  return (
    <div className="flex flex-wrap items-center gap-3 border-y border-line py-3">
      <SegmentedControl
        value={value.period}
        onChange={(period: CalendarPeriodKey) => onChange({ ...value, period })}
        options={PERIOD_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
      />

      {owners.length > 1 ? (
        <div className="relative">
          <select
            aria-label="Filter by sales rep"
            value={value.ownerId ?? ''}
            onChange={(event) =>
              onChange({ ...value, ownerId: event.target.value || null })
            }
            className={cn(
              controlBase,
              controlTone(false),
              'h-9 w-[190px] appearance-none pr-8 text-body',
              !value.ownerId && 'text-ink-muted',
            )}
          >
            <option value="">All sales reps</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id} className="bg-elevated text-ink">
                {owner.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={() => onChange({ ...value, ownerId: null })}
          className="inline-flex items-center gap-1.5 rounded-field px-2 py-1.5 text-xs text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
        >
          <X className="size-3" />
          Clear filter
        </button>
      ) : null}
    </div>
  )
}
