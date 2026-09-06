import { FUNNEL_STAGES, type Opportunity, type Stage } from '@/domain/commerce'
import { isWithin } from '@/lib/dates'
import type { PeriodRange } from './periods'

/**
 * The funnel is measured as a **cohort**.
 *
 * Counting deals sitting in each stage today answers "where is the pipeline
 * parked", not "how well do deals progress". Counting stage entries per stage
 * inside the window is worse still: with a sales cycle longer than the window,
 * each stage measures a different set of deals and the ratios are meaningless.
 *
 * So the cohort is the opportunities that entered the funnel inside the range,
 * and each stage reports how many of *those* ever reached it.
 *
 * The trade-off is stated in the UI: for a window shorter than the sales cycle
 * the late stages are understated, because part of the cohort is still in play.
 */
export interface FunnelStageStat {
  stage: Stage
  /** Opportunities from the cohort that reached this stage. */
  entered: number
  /** Their combined value. */
  value: number
  /** entered(this) / entered(previous stage). Null for the first stage. */
  conversionFromPrevious: number | null
}

const reachedStage = (opportunity: Opportunity, stage: Stage): boolean =>
  opportunity.stageHistory.some((event) => event.stage === stage)

/** Opportunities that entered the funnel inside the range. */
export function funnelCohort(
  opportunities: Opportunity[],
  range: PeriodRange,
): Opportunity[] {
  const entry = FUNNEL_STAGES[0]
  return opportunities.filter((opportunity) =>
    opportunity.stageHistory.some(
      (event) => event.stage === entry && isWithin(event.at, range.start, range.end),
    ),
  )
}

export function buildFunnel(
  opportunities: Opportunity[],
  range: PeriodRange,
): FunnelStageStat[] {
  const cohort = funnelCohort(opportunities, range)
  let previousCount: number | null = null

  return FUNNEL_STAGES.map((stage) => {
    const matching = cohort.filter((opportunity) => reachedStage(opportunity, stage))
    const entered = matching.length
    const stat: FunnelStageStat = {
      stage,
      entered,
      value: matching.reduce((total, opportunity) => total + opportunity.value, 0),
      conversionFromPrevious:
        previousCount === null || previousCount === 0 ? null : entered / previousCount,
    }
    previousCount = entered
    return stat
  })
}

export interface StageConversion {
  from: Stage
  to: Stage
  rate: number | null
  previousRate: number | null
  /** Change in percentage points against the previous range. */
  changePoints: number | null
  /** Cohort deals that made the jump. */
  deals: number
  /** Cohort deals that reached the source stage. */
  entered: number
}

/** A drop of this many percentage points is worth flagging in the UI. */
export const SIGNIFICANT_CONVERSION_DROP = 0.05

export function stageConversions(
  opportunities: Opportunity[],
  range: PeriodRange,
  previousRange: PeriodRange,
): StageConversion[] {
  const current = buildFunnel(opportunities, range)
  const previous = buildFunnel(opportunities, previousRange)

  return FUNNEL_STAGES.slice(1).map((stage, index) => {
    const from = FUNNEL_STAGES[index]
    const rate = current[index + 1].conversionFromPrevious
    const previousRate = previous[index + 1].conversionFromPrevious

    return {
      from,
      to: stage,
      rate,
      previousRate,
      changePoints: rate !== null && previousRate !== null ? rate - previousRate : null,
      deals: current[index + 1].entered,
      entered: current[index].entered,
    }
  })
}
