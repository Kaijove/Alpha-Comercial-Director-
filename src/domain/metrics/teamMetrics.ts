import {
  ACTIVITY_LABELS,
  isOpen,
  type Activity,
  type ActivityType,
  type CommercialDataset,
  type Opportunity,
  type Owner,
  type Stage,
} from '@/domain/commerce'
import { isWithin } from '@/lib/dates'
import { assessOpportunityRisk, STALE_DAYS } from '@/domain/risk/riskEngine'
import {
  averageDealSize,
  byOwner,
  closedIn,
  median,
  pipelineCoverage,
  pipelineValue,
  revenueOf,
  salesCycleStats,
  sum,
  weightedPipelineValue,
  weightedValue,
  winRateOf,
  wonIn,
  type SalesCycleStats,
} from './primitives'
import type { PeriodRange } from './periods'

/**
 * Any window that can be compared with the one before it. Both the dashboard's
 * calendar `Period` and the analytics trailing window satisfy this, so per-rep
 * figures are computed by the same function on both screens.
 */
export interface ComparableRange extends PeriodRange {
  previous: PeriodRange
  /**
   * The actual current time. Distinct from `end`, which for a calendar period
   * is the end of the month: measuring inactivity from a future date made
   * almost every open deal look stalled.
   */
  now: Date
}

export interface ActivityStats {
  call: number
  meeting: number
  email: number
  proposal: number
  'follow-up': number
  note: number
  total: number
  lastAt: string | null
}

export const ACTIVITY_BREAKDOWN: ActivityType[] = [
  'call',
  'meeting',
  'email',
  'follow-up',
]

export const ACTIVITY_BREAKDOWN_LABELS = ACTIVITY_BREAKDOWN.map(
  (type) => ACTIVITY_LABELS[type],
)

export interface RepMetrics {
  owner: Owner
  revenue: number
  previousRevenue: number
  /** Relative change against the previous window, null without a baseline. */
  revenueDelta: number | null
  target: number
  /** revenue / target, null when the rep has no target. */
  attainment: number | null
  remaining: number
  wonCount: number
  lostCount: number
  openCount: number
  pipeline: number
  weightedPipeline: number
  /** Open pipeline over what is left of their target. */
  coverage: number | null
  winRate: number | null
  previousWinRate: number | null
  averageDealSize: number | null
  salesCycle: SalesCycleStats
  activity: ActivityStats
  stalledCount: number
  /** Most recent activity across all of their opportunities. */
  lastActivityAt: string | null
  /** Largest single open deal as a share of their pipeline. */
  concentration: number | null
}

function emptyActivity(): ActivityStats {
  return {
    call: 0,
    meeting: 0,
    email: 0,
    proposal: 0,
    'follow-up': 0,
    note: 0,
    total: 0,
    lastAt: null,
  }
}

export function activityStatsFor(
  activities: Activity[],
  ownerId: string,
  range: PeriodRange,
): ActivityStats {
  const stats = emptyActivity()

  // ISO-8601 timestamps of the same length and zone sort lexicographically, so
  // the running maximum needs no date parsing at all - and this loop walks every
  // activity in the dataset once per representative.
  for (const activity of activities) {
    if (activity.ownerId !== ownerId) continue
    if (!stats.lastAt || activity.at > stats.lastAt) {
      stats.lastAt = activity.at
    }
    if (!isWithin(activity.at, range.start, range.end)) continue
    stats[activity.type] += 1
    stats.total += 1
  }

  return stats
}

/**
 * Per-rep figures, derived from exactly the same primitives the company-level
 * KPIs use. Team, Dashboard and Analytics therefore cannot disagree.
 *
 * Targets come in already resolved (see `buildRepTargets`), so this function
 * stays free of any opinion about how quota is assigned.
 */
export function computeRepMetrics(
  dataset: CommercialDataset,
  period: ComparableRange,
  targets: Map<string, number>,
): RepMetrics[] {
  const now = period.now

  return dataset.owners.map((owner) => {
    const owned = byOwner(dataset.opportunities, owner.id)
    const won = wonIn(owned, period)
    const closed = closedIn(owned, period)
    const open = owned.filter(isOpen)

    const revenue = revenueOf(won)
    const previousRevenue = revenueOf(wonIn(owned, period.previous))
    const target = targets.get(owner.id) ?? 0
    const remaining = Math.max(0, target - revenue)
    const pipeline = pipelineValue(owned)
    const largest = open.reduce((max, o) => Math.max(max, o.value), 0)

    return {
      owner,
      revenue,
      previousRevenue,
      revenueDelta:
        previousRevenue > 0 ? (revenue - previousRevenue) / previousRevenue : null,
      target,
      attainment: target > 0 ? revenue / target : null,
      remaining,
      wonCount: won.length,
      lostCount: closed.length - won.length,
      openCount: open.length,
      pipeline,
      weightedPipeline: weightedPipelineValue(owned),
      coverage: pipelineCoverage(pipeline, remaining),
      winRate: winRateOf(closed),
      previousWinRate: winRateOf(closedIn(owned, period.previous)),
      averageDealSize: averageDealSize(won),
      salesCycle: salesCycleStats(won),
      activity: activityStatsFor(dataset.activities, owner.id, period),
      stalledCount: open.filter(
        (opportunity) => assessOpportunityRisk(opportunity, now).inactiveDays >= STALE_DAYS,
      ).length,
      lastActivityAt: open
        .concat(won)
        .reduce<string | null>(
          (latest, opportunity) =>
            !latest || new Date(opportunity.lastActivityAt) > new Date(latest)
              ? opportunity.lastActivityAt
              : latest,
          null,
        ),
      concentration: pipeline > 0 ? largest / pipeline : null,
    }
  })
}

export interface TeamBenchmarks {
  revenue: number
  attainment: number | null
  winRate: number | null
  averageDealSize: number | null
  salesCycle: number | null
  pipeline: number
  activity: number
}

/**
 * Team averages used for the per-rep comparisons.
 *
 * Rates average only over the reps that have one, so a rep with no closed deals
 * does not silently drag the benchmark towards zero.
 */
export function teamBenchmarks(reps: RepMetrics[]): TeamBenchmarks {
  const size = Math.max(1, reps.length)
  const withWinRate = reps.filter((rep) => rep.winRate !== null)
  const withDealSize = reps.filter((rep) => rep.averageDealSize !== null)
  const withCycle = reps.filter((rep) => rep.salesCycle.average !== null)
  const withAttainment = reps.filter((rep) => rep.attainment !== null)

  return {
    revenue: sum(reps.map((rep) => rep.revenue)) / size,
    attainment: withAttainment.length
      ? sum(withAttainment.map((rep) => rep.attainment as number)) / withAttainment.length
      : null,
    winRate: withWinRate.length
      ? sum(withWinRate.map((rep) => rep.winRate as number)) / withWinRate.length
      : null,
    averageDealSize: withDealSize.length
      ? sum(withDealSize.map((rep) => rep.averageDealSize as number)) / withDealSize.length
      : null,
    salesCycle: withCycle.length
      ? median(withCycle.map((rep) => rep.salesCycle.average as number))
      : null,
    pipeline: sum(reps.map((rep) => rep.pipeline)) / size,
    activity: sum(reps.map((rep) => rep.activity.total)) / size,
  }
}

export interface StageSplit {
  stage: Stage
  count: number
  value: number
}

/** Open deals by stage for one rep, for the detail panel. */
export function repStageSplit(
  opportunities: Opportunity[],
  ownerId: string,
  stages: Stage[],
): StageSplit[] {
  const open = byOwner(opportunities, ownerId).filter(isOpen)
  return stages.map((stage) => {
    const inStage = open.filter((opportunity) => opportunity.stage === stage)
    return {
      stage,
      count: inStage.length,
      value: sum(inStage.map((opportunity) => opportunity.value)),
    }
  })
}

export { weightedValue }
