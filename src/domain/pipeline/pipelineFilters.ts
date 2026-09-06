import { isOpen, type Opportunity, type Stage } from '@/domain/commerce'
import { assessOpportunityRisk, type RiskLevel } from '@/domain/risk/riskEngine'
import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates'

/**
 * Pipeline filtering, as pure functions.
 *
 * One predicate set drives the Kanban, the table and the header totals, so the
 * three can never disagree about what is in scope.
 */
export type ClosingWindow =
  | 'any'
  | 'this-week'
  | 'this-month'
  | 'next-month'
  | 'custom'

export const CLOSING_WINDOWS: { value: ClosingWindow; label: string }[] = [
  { value: 'any', label: 'Any close date' },
  { value: 'this-week', label: 'Closing this week' },
  { value: 'this-month', label: 'Closing this month' },
  { value: 'next-month', label: 'Closing next month' },
  { value: 'custom', label: 'Custom range' },
]

export interface PipelineFilterState {
  search: string
  /** Empty means every stage. */
  stages: Stage[]
  ownerId: string | null
  /** 0..1, inclusive lower bound. */
  minProbability: number | null
  minValue: number | null
  risk: RiskLevel | null
  closing: ClosingWindow
  customRange: { start: string; end: string }
}

export const EMPTY_PIPELINE_FILTERS: PipelineFilterState = {
  search: '',
  stages: [],
  ownerId: null,
  minProbability: null,
  minValue: null,
  risk: null,
  closing: 'any',
  customRange: { start: '', end: '' },
}

export function activeFilterCount(filters: PipelineFilterState): number {
  let count = 0
  if (filters.search.trim()) count += 1
  if (filters.stages.length > 0) count += 1
  if (filters.ownerId) count += 1
  if (filters.minProbability !== null) count += 1
  if (filters.minValue !== null) count += 1
  if (filters.risk) count += 1
  if (filters.closing !== 'any') count += 1
  return count
}

export interface ClosingRange {
  start: Date
  end: Date
}

export function resolveClosingWindow(
  filters: PipelineFilterState,
  now: Date,
  weekStartsOn: 'monday' | 'sunday',
): ClosingRange | null {
  switch (filters.closing) {
    case 'this-week':
      return { start: startOfWeek(now, weekStartsOn), end: endOfWeek(now, weekStartsOn) }
    case 'this-month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'next-month': {
      const next = addMonths(now, 1)
      return { start: startOfMonth(next), end: endOfMonth(next) }
    }
    case 'custom': {
      if (!filters.customRange.start || !filters.customRange.end) return null
      return {
        start: startOfDay(new Date(filters.customRange.start)),
        end: endOfDay(new Date(filters.customRange.end)),
      }
    }
    default:
      return null
  }
}

export interface FilterContext {
  now: Date
  weekStartsOn: 'monday' | 'sunday'
  customerName: (id: string) => string
  ownerName: (id: string) => string
}

/**
 * Search matches the deal name, the account and the owner - the three things a
 * director actually types when hunting for a deal.
 */
function matchesSearch(
  opportunity: Opportunity,
  term: string,
  context: FilterContext,
): boolean {
  if (!term) return true
  const haystack = [
    opportunity.name,
    context.customerName(opportunity.customerId),
    context.ownerName(opportunity.ownerId),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(term)
}

export function filterOpportunities(
  opportunities: Opportunity[],
  filters: PipelineFilterState,
  context: FilterContext,
): Opportunity[] {
  const term = filters.search.trim().toLowerCase()
  const closing = resolveClosingWindow(filters, context.now, context.weekStartsOn)

  return opportunities.filter((opportunity) => {
    if (!matchesSearch(opportunity, term, context)) return false
    if (filters.stages.length > 0 && !filters.stages.includes(opportunity.stage)) return false
    if (filters.ownerId && opportunity.ownerId !== filters.ownerId) return false
    if (filters.minValue !== null && opportunity.value < filters.minValue) return false

    if (filters.minProbability !== null && opportunity.probability < filters.minProbability) {
      return false
    }

    if (closing) {
      const close = new Date(opportunity.expectedCloseDate).getTime()
      if (close < closing.start.getTime() || close > closing.end.getTime()) return false
    }

    if (filters.risk) {
      // Closed deals carry no forward risk, so a risk filter excludes them.
      if (!isOpen(opportunity)) return false
      if (assessOpportunityRisk(opportunity, context.now).level !== filters.risk) return false
    }

    return true
  })
}
