import {
  isOpen,
  isLost,
  isWon,
  OPEN_STAGES,
  type Opportunity,
  type Stage,
} from '@/domain/commerce'
import { isWithin } from '@/lib/dates'
import type { PeriodRange } from './periods'

/**
 * The single definition of every commercial metric in the product.
 *
 * Dashboard, Analytics, Pipeline, Team and Forecast all call these functions.
 * If a number needs to change, it changes here once.
 */

export const sum = (values: number[]): number => values.reduce((total, v) => total + v, 0)

export function byOwner(opportunities: Opportunity[], ownerId: string | null): Opportunity[] {
  if (!ownerId) return opportunities
  return opportunities.filter((opportunity) => opportunity.ownerId === ownerId)
}

/** Deals closed (won or lost) inside a range. */
export function closedIn(opportunities: Opportunity[], range: PeriodRange): Opportunity[] {
  return opportunities.filter((opportunity) =>
    isWithin(opportunity.closedAt, range.start, range.end),
  )
}

export function wonIn(opportunities: Opportunity[], range: PeriodRange): Opportunity[] {
  return closedIn(opportunities, range).filter(isWon)
}

export function lostIn(opportunities: Opportunity[], range: PeriodRange): Opportunity[] {
  return closedIn(opportunities, range).filter(isLost)
}

/** Revenue = the value of deals won inside the range. Nothing else. */
export function revenueOf(opportunities: Opportunity[]): number {
  return sum(opportunities.filter(isWon).map((opportunity) => opportunity.value))
}

export function openOpportunities(opportunities: Opportunity[]): Opportunity[] {
  return opportunities.filter(isOpen)
}

/** Total open pipeline: the face value of everything still in play. */
export function pipelineValue(opportunities: Opportunity[]): number {
  return sum(openOpportunities(opportunities).map((opportunity) => opportunity.value))
}

/** Weighted pipeline: value x probability, the only definition in the app. */
export function weightedValue(opportunity: Opportunity): number {
  return opportunity.value * opportunity.probability
}

export function weightedPipelineValue(opportunities: Opportunity[]): number {
  return sum(openOpportunities(opportunities).map(weightedValue))
}

/** Open deals whose expected close falls on or before a date. */
export function closingBy(opportunities: Opportunity[], end: Date): Opportunity[] {
  return openOpportunities(opportunities).filter(
    (opportunity) => new Date(opportunity.expectedCloseDate).getTime() <= end.getTime(),
  )
}

export function closingBetween(
  opportunities: Opportunity[],
  start: Date,
  end: Date,
): Opportunity[] {
  return openOpportunities(opportunities).filter((opportunity) =>
    isWithin(opportunity.expectedCloseDate, start, end),
  )
}

/** Win rate over closed deals: won / (won + lost). Returns null when empty. */
export function winRateOf(opportunities: Opportunity[]): number | null {
  const won = opportunities.filter(isWon).length
  const lost = opportunities.filter(isLost).length
  const closed = won + lost
  if (closed === 0) return null
  return won / closed
}

/** Average value of the won deals supplied. Null when there are none. */
export function averageDealSize(opportunities: Opportunity[]): number | null {
  const won = opportunities.filter(isWon)
  if (won.length === 0) return null
  return revenueOf(won) / won.length
}

/**
 * Pipeline coverage: total open pipeline at face value over what is left of the
 * target. This is the classic definition - the benchmark of roughly 3x exists
 * precisely because only a fraction of face value converts, so weighting the
 * pipeline here would double-count the discount.
 *
 * Returns null once the target is already covered by closed revenue.
 */
export function pipelineCoverage(
  openPipeline: number,
  remainingTarget: number,
): number | null {
  if (remainingTarget <= 0) return null
  return openPipeline / remainingTarget
}

/**
 * Above this, the ratio stops carrying information: it only means the window is
 * nearly booked, so the remaining target is a rounding error. Reported as
 * "ample" rather than as a headline multiple.
 */
export const AMPLE_COVERAGE = 10

export const isCoverageAmple = (coverage: number | null): boolean =>
  coverage !== null && coverage >= AMPLE_COVERAGE

export interface StageBucket {
  stage: Stage
  count: number
  value: number
  weighted: number
}

export function stageBreakdown(opportunities: Opportunity[]): StageBucket[] {
  const open = openOpportunities(opportunities)
  return OPEN_STAGES.map((stage) => {
    const inStage = open.filter((opportunity) => opportunity.stage === stage)
    return {
      stage,
      count: inStage.length,
      value: sum(inStage.map((opportunity) => opportunity.value)),
      weighted: sum(inStage.map(weightedValue)),
    }
  })
}

/** Relative change. Null when there is no comparable baseline. */
export function deltaRatio(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
  return (current - previous) / previous
}

/** Difference in percentage points, for comparing two rates. */
export function deltaPoints(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null
  return current - previous
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export interface SalesCycleStats {
  average: number | null
  median: number | null
  /** Won deals the figures are based on. */
  count: number
}

/**
 * Days from creation to close, over won deals. Median matters as much as the
 * average here: one twelve-month deal can drag the mean a long way.
 */
export function salesCycleStats(opportunities: Opportunity[]): SalesCycleStats {
  const won = opportunities.filter(
    (opportunity) => isWon(opportunity) && opportunity.closedAt,
  )
  if (won.length === 0) return { average: null, median: null, count: 0 }

  const durations = won.map((opportunity) => {
    const created = new Date(opportunity.createdAt).getTime()
    const closed = new Date(opportunity.closedAt as string).getTime()
    return Math.max(0, (closed - created) / 86_400_000)
  })

  return {
    average: sum(durations) / durations.length,
    median: median(durations),
    count: won.length,
  }
}
