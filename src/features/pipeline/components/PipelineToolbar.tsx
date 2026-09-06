import { useState } from 'react'
import { Filter, LayoutGrid, Search, Table2, X } from 'lucide-react'
import { OPEN_STAGES, STAGES, STAGE_LABELS, type Stage } from '@/domain/commerce'
import type { Owner } from '@/domain/commerce'
import {
  CLOSING_WINDOWS,
  activeFilterCount,
  type ClosingWindow,
  type PipelineFilterState,
} from '@/domain/pipeline/pipelineFilters'
import { RISK_LABELS, type RiskLevel } from '@/domain/risk/riskEngine'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { controlBase, controlTone } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { PipelineView } from '../usePipelineData'

const control = cn(controlBase, controlTone(false), 'h-9 text-body')

/**
 * View switch, search and filters.
 *
 * The filter state is owned by the page, so switching between Kanban and Table
 * keeps every filter, the search term and the close-date window in place.
 */
export function PipelineToolbar({
  view,
  onViewChange,
  filters,
  onFiltersChange,
  onClear,
  owners,
  resultCount,
}: {
  view: PipelineView
  onViewChange: (view: PipelineView) => void
  filters: PipelineFilterState
  onFiltersChange: (filters: PipelineFilterState) => void
  onClear: () => void
  owners: Owner[]
  resultCount: number
}) {
  const [showFilters, setShowFilters] = useState(false)
  const active = activeFilterCount(filters)

  const toggleStage = (stage: Stage) => {
    const next = filters.stages.includes(stage)
      ? filters.stages.filter((entry) => entry !== stage)
      : [...filters.stages, stage]
    onFiltersChange({ ...filters, stages: next })
  }

  return (
    <div className="space-y-3 border-y border-line py-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          value={view}
          onChange={onViewChange}
          options={[
            { value: 'kanban', label: 'Kanban' },
            { value: 'table', label: 'Table' },
          ]}
        />

        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            aria-label="Search opportunities"
            placeholder="Search opportunities..."
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            className={cn(control, 'w-full pl-9')}
          />
        </div>

        <Button
          type="button"
          size="sm"
          variant={showFilters || active > 0 ? 'secondary' : 'ghost'}
          onClick={() => setShowFilters((current) => !current)}
          iconLeft={<Filter className="size-3.5" />}
        >
          Filters
          {active > 0 ? (
            <span className="ml-1 rounded-full bg-accent/15 px-1.5 text-2xs font-medium text-accent">
              {active}
            </span>
          ) : null}
        </Button>

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

        <span className="ml-auto hidden items-center gap-1.5 text-xs text-ink-faint sm:flex">
          {view === 'kanban' ? (
            <LayoutGrid className="size-3.5" aria-hidden />
          ) : (
            <Table2 className="size-3.5" aria-hidden />
          )}
          <span className="tnum">{resultCount}</span> matching
        </span>
      </div>

      {showFilters ? (
        <div className="animate-fade-in space-y-4 rounded-panel border border-line bg-surface p-4">
          <div className="space-y-2">
            <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
              Stage
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((stage) => {
                const on = filters.stages.includes(stage)
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => toggleStage(stage)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-colors duration-150',
                      on
                        ? 'border-accent/30 bg-accent/10 text-accent'
                        : 'border-line bg-elevated text-ink-muted hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </button>
                )
              })}
              {filters.stages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, stages: [] })}
                  className="rounded-full px-2.5 py-1 text-xs text-ink-faint transition-colors hover:text-ink-muted"
                >
                  All stages
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
                Owner
              </span>
              <select
                value={filters.ownerId ?? ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, ownerId: event.target.value || null })
                }
                className={cn(control, 'w-full appearance-none pr-8')}
              >
                <option value="">All owners</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id} className="bg-elevated text-ink">
                    {owner.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
                Min. probability
              </span>
              <select
                value={filters.minProbability ?? ''}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    minProbability: event.target.value ? Number(event.target.value) : null,
                  })
                }
                className={cn(control, 'w-full appearance-none pr-8')}
              >
                <option value="">Any probability</option>
                {[0.25, 0.5, 0.7, 0.9].map((value) => (
                  <option key={value} value={value} className="bg-elevated text-ink">
                    {Math.round(value * 100)}% or more
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
                Min. value
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                inputMode="numeric"
                value={filters.minValue ?? ''}
                placeholder="Any value"
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    minValue: event.target.value ? Number(event.target.value) : null,
                  })
                }
                className={cn(control, 'w-full')}
              />
            </label>

            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
                Risk
              </span>
              <select
                value={filters.risk ?? ''}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    risk: (event.target.value || null) as RiskLevel | null,
                  })
                }
                className={cn(control, 'w-full appearance-none pr-8')}
              >
                <option value="">Any risk</option>
                {(Object.keys(RISK_LABELS) as RiskLevel[]).map((level) => (
                  <option key={level} value={level} className="bg-elevated text-ink">
                    {RISK_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <label className="space-y-1.5">
              <span className="block text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
                Expected close
              </span>
              <select
                value={filters.closing}
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    closing: event.target.value as ClosingWindow,
                  })
                }
                className={cn(control, 'w-[190px] appearance-none pr-8')}
              >
                {CLOSING_WINDOWS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-elevated text-ink"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {filters.closing === 'custom' ? (
              <div className="flex items-end gap-2">
                <input
                  type="date"
                  aria-label="Close date from"
                  value={filters.customRange.start}
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      customRange: { ...filters.customRange, start: event.target.value },
                    })
                  }
                  className={cn(control, 'w-[150px]')}
                />
                <span className="pb-2 text-xs text-ink-faint">to</span>
                <input
                  type="date"
                  aria-label="Close date to"
                  value={filters.customRange.end}
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      customRange: { ...filters.customRange, end: event.target.value },
                    })
                  }
                  className={cn(control, 'w-[150px]')}
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, stages: [...OPEN_STAGES] })}
              className="ml-auto rounded-field px-2.5 py-1.5 text-xs text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
            >
              Open stages only
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
