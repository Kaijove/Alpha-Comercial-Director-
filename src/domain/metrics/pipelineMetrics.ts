import {
  STAGES,
  isOpen,
  type Opportunity,
  type Stage,
} from '@/domain/commerce'
import type { Workspace } from '@/domain/workspace'
import { addDays, endOfMonth, startOfMonth } from '@/lib/dates'
import { assessOpportunityRisk, RISK_ORDER, STALE_DAYS } from '@/domain/risk/riskEngine'
import {
  closedIn,
  closingBetween,
  openOpportunities,
  pipelineCoverage,
  revenueOf,
  sum,
  weightedPipelineValue,
  weightedValue,
  winRateOf,
  wonIn,
} from './primitives'
import { resolvePeriod, targetForPeriod } from './periods'

/**
 * Pipeline figures.
 *
 * Every one of these calls the shared primitives, so total pipeline, weighted
 * pipeline, average deal size, win rate and coverage mean exactly what they
 * mean on the Dashboard and in Analytics.
 */
export interface StageBoardBucket {
  stage: Stage
  opportunities: Opportunity[]
  count: number
  value: number
  weighted: number
}

export interface PipelineMetrics {
  total: number
  weighted: number
  openCount: number
  /** Weighted value of open deals expected to land before the month ends. */
  expectedThisMonth: number
  closingThisMonthCount: number

  averageDealSize: number | null
  /** Win rate over the trailing 90 days, the same definition as elsewhere. */
  winRate: number | null
  coverage: number | null
  remainingTarget: number

  board: StageBoardBucket[]
  stalled: Opportunity[]
  closingSoon: Opportunity[]
  highestValue: Opportunity[]
  highestProbability: Opportunity[]
}

/** Closed columns show a recent window; the full history would be unusable. */
export const CLOSED_COLUMN_DAYS = 30

export function computePipelineMetrics(
  /** Already filtered by the pipeline filters. */
  scoped: Opportunity[],
  /** Unfiltered, for figures that must reflect the whole business. */
  all: Opportunity[],
  workspace: Workspace,
  now: Date,
): PipelineMetrics {
  const open = openOpportunities(scoped)
  const total = sum(open.map((opportunity) => opportunity.value))

  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const closingThisMonth = closingBetween(scoped, monthStart, monthEnd)

  // Coverage and win rate describe the business, not the current filter, so
  // they are computed on the full dataset against the month's commitment.
  const month = resolvePeriod('mtd', now)
  const monthTarget = targetForPeriod(workspace.goals, month)
  const remainingTarget = Math.max(0, monthTarget - revenueOf(wonIn(all, month)))
  const trailing90 = { start: addDays(now, -90), end: now }

  // `scoped` already carries the page's closed-deal window, so grouping by
  // stage is all that is left to do here.
  const board: StageBoardBucket[] = STAGES.map((stage) => {
    const inStage = scoped.filter((opportunity) => opportunity.stage === stage)

    return {
      stage,
      opportunities: inStage,
      count: inStage.length,
      value: sum(inStage.map((opportunity) => opportunity.value)),
      weighted: sum(inStage.map(weightedValue)),
    }
  })

  const stalled = open
    .map((opportunity) => ({
      opportunity,
      risk: assessOpportunityRisk(opportunity, now),
    }))
    .filter((entry) => entry.risk.inactiveDays >= STALE_DAYS)
    .sort((a, b) => b.risk.score - a.risk.score || b.opportunity.value - a.opportunity.value)
    .map((entry) => entry.opportunity)

  const closingSoon = closingBetween(scoped, now, addDays(now, 7)).sort((a, b) => {
    const byDate =
      new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime()
    if (byDate !== 0) return byDate
    const byValue = b.value - a.value
    if (byValue !== 0) return byValue
    return (
      RISK_ORDER[assessOpportunityRisk(a, now).level] -
      RISK_ORDER[assessOpportunityRisk(b, now).level]
    )
  })

  return {
    total,
    weighted: weightedPipelineValue(scoped),
    openCount: open.length,
    expectedThisMonth: sum(closingThisMonth.map(weightedValue)),
    closingThisMonthCount: closingThisMonth.length,

    averageDealSize: open.length > 0 ? total / open.length : null,
    winRate: winRateOf(closedIn(all, trailing90)),
    coverage: pipelineCoverage(
      sum(openOpportunities(all).map((opportunity) => opportunity.value)),
      remainingTarget,
    ),
    remainingTarget,

    board,
    stalled,
    closingSoon,
    highestValue: [...open].sort((a, b) => b.value - a.value).slice(0, 5),
    // Best opportunity, not biggest: weighted value ranks a small certain deal
    // above a large improbable one.
    highestProbability: [...open]
      .sort((a, b) => weightedValue(b) - weightedValue(a))
      .slice(0, 5),
  }
}

export const isOpenStage = (stage: Stage): boolean =>
  stage !== 'won' && stage !== 'lost'

export { isOpen }
