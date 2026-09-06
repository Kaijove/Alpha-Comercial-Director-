import { X } from 'lucide-react'
import type { Owner } from '@/domain/commerce'
import { ANALYTICS_RANGES, type AnalyticsRangeKey } from '@/domain/metrics/ranges'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { controlBase, controlTone } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { AnalyticsFilterState } from '../useAnalyticsData'

/**
 * Every control here re-scopes the whole page. The custom range only appears
 * once "Custom" is selected, so the bar stays quiet the rest of the time.
 */
export function AnalyticsFilters({
  value,
  onChange,
  owners,
  maxDate,
}: {
  value: AnalyticsFilterState
  onChange: (next: AnalyticsFilterState) => void
  owners: Owner[]
  maxDate: string
}) {
  const showCustom = value.range === 'custom'

  return (
    <div className="flex flex-wrap items-center gap-3 border-y border-line py-3">
      <SegmentedControl
        value={value.range}
        onChange={(range: AnalyticsRangeKey) => onChange({ ...value, range })}
        options={ANALYTICS_RANGES}
      />

      {showCustom ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Range start"
            value={value.custom.start}
            max={value.custom.end}
            onChange={(event) =>
              onChange({ ...value, custom: { ...value.custom, start: event.target.value } })
            }
            className={cn(controlBase, controlTone(false), 'h-9 w-[150px] text-body')}
          />
          <span className="text-xs text-ink-faint">to</span>
          <input
            type="date"
            aria-label="Range end"
            value={value.custom.end}
            min={value.custom.start}
            max={maxDate}
            onChange={(event) =>
              onChange({ ...value, custom: { ...value.custom, end: event.target.value } })
            }
            className={cn(controlBase, controlTone(false), 'h-9 w-[150px] text-body')}
          />
        </div>
      ) : null}

      {owners.length > 1 ? (
        <select
          aria-label="Filter by sales rep"
          value={value.ownerId ?? ''}
          onChange={(event) => onChange({ ...value, ownerId: event.target.value || null })}
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
      ) : null}

      {value.ownerId ? (
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
