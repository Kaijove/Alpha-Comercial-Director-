import { daysUntil, type Activity, type Opportunity } from '@/domain/commerce'
import {
  assessOpportunityHealth,
  type HealthBand,
} from '@/domain/intelligence/opportunityScoring'
import type { PeriodRange } from '@/domain/metrics/periods'
import { FORECAST_CONFIG as C } from './forecastConfig'
import type { ForecastContribution } from './types'

/**
 * Per-deal forecast contribution.
 *
 *   contribution = value x probability x healthFactor x timingFactor
 *
 * Deliberately not plain `value x probability`. The product already knows
 * whether a deal is being worked and whether its date leaves any room to slip,
 * and a forecast that ignores both flatters itself: two deals at 100k and 60%
 * are not worth the same when one has been silent for three weeks and is due on
 * Friday.
 *
 * Equally deliberately, it stops at four terms. A director has to be able to
 * read the row and reproduce the number, so every factor is a single visible
 * multiplier with a stated reason.
 *
 * Neither factor ever writes back to probability: that is the rep's judgement
 * and it stays theirs.
 */

export interface CalculatorContext {
  now: Date
  period: PeriodRange
  activitiesFor: (opportunityId: string) => Activity[]
  /** Average open deal value, used by the health assessment. */
  averageOpenValue: number
}

/** How the close date sits against the end of the period. */
function timingFor(
  opportunity: Opportunity,
  context: CalculatorContext,
): { factor: number; reason: string | null } {
  const daysToClose = daysUntil(opportunity.expectedCloseDate, context.now)
  const daysToPeriodEnd = daysUntil(context.period.end.toISOString(), context.now)

  if (daysToClose < 0) {
    return {
      factor: C.timing.overdue,
      reason: `Expected close was ${Math.abs(daysToClose)} ${Math.abs(daysToClose) === 1 ? 'day' : 'days'} ago and the deal is still open`,
    }
  }

  if (daysToPeriodEnd - daysToClose <= C.timing.tightDays) {
    return {
      factor: C.timing.tight,
      reason: 'Due in the closing days of the period, with no room to slip',
    }
  }

  return { factor: C.timing.comfortable, reason: null }
}

/**
 * Deals that belong in this period's forecast: open, and expected to close on
 * or before the period ends. A deal already past its date and still open counts
 * too - it has not gone away, it has slipped - but at a heavy timing discount.
 */
export function forecastableDeals(
  opportunities: Opportunity[],
  period: PeriodRange,
): Opportunity[] {
  return opportunities.filter((opportunity) => {
    if (opportunity.stage === 'won' || opportunity.stage === 'lost') return false
    const close = new Date(opportunity.expectedCloseDate)
    return close <= period.end
  })
}

export function contributionFor(
  opportunity: Opportunity,
  context: CalculatorContext,
): ForecastContribution {
  const health = assessOpportunityHealth(opportunity, {
    now: context.now,
    activities: context.activitiesFor(opportunity.id),
    averageOpenValue: context.averageOpenValue,
  })

  const healthFactor = C.healthFactor[health.band]
  const timing = timingFor(opportunity, context)

  const value = opportunity.value
  const probability = opportunity.probability
  const contribution = value * probability * healthFactor * timing.factor

  // Best case lifts probability toward - never to - certainty, by health band.
  //
  // One invariant governs it: the best case can never credit a deal with less
  // than the base case already does. Two ways that was violated before:
  //
  //  - a deal the rep had marked at 100% was capped to the 95% ceiling, so a
  //    pipeline of certainties produced a best case *below* the base case;
  //  - a critical deal was dropped from the best case entirely while the base
  //    case still credited it at 0.35x, so a pipeline of stalled deals showed
  //    Best Case 0 next to Base Case 1,750.
  //
  // The best case for a bad deal is that it closes as currently modelled, not
  // that it disappears.
  const uplift = C.bestCaseUplift[health.band]
  const upliftedProbability = Math.min(
    C.bestCaseCeiling,
    probability + (1 - probability) * uplift,
  )
  const bestCaseContribution = Math.max(contribution, value * upliftedProbability)

  const inWorstCase =
    probability >= C.worstCaseProbability &&
    (C.worstCaseBands as readonly HealthBand[]).includes(health.band)

  const adjustment =
    healthFactor < 1 && timing.reason
      ? `${health.reason}. ${timing.reason}`
      : healthFactor < 1
        ? health.reason
        : timing.reason

  return {
    opportunity,
    health,
    value,
    probability,
    healthFactor,
    timingFactor: timing.factor,
    contribution,
    adjustment,
    inWorstCase,
    // Every deal the base case counts is counted in the best case too.
    inBestCase: true,
    bestCaseContribution,
  }
}

/** Scores every deal that belongs in the period, richest contribution first. */
export function computeContributions(
  opportunities: Opportunity[],
  context: CalculatorContext,
): ForecastContribution[] {
  return forecastableDeals(opportunities, context.period)
    .map((opportunity) => contributionFor(opportunity, context))
    .sort((a, b) => b.contribution - a.contribution)
}

export const totalContribution = (entries: ForecastContribution[]): number =>
  entries.reduce((total, entry) => total + entry.contribution, 0)
