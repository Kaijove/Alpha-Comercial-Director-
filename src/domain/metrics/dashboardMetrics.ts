import type { CommercialDataset, Opportunity } from '@/domain/commerce'
import type { Workspace } from '@/domain/workspace'
import { addDays } from '@/lib/dates'
import {
  averageDealSize,
  byOwner,
  closedIn,
  closingBy,
  deltaPoints,
  deltaRatio,
  openOpportunities,
  pipelineCoverage,
  pipelineValue,
  revenueOf,
  stageBreakdown,
  weightedPipelineValue,
  weightedValue,
  winRateOf,
  wonIn,
  type StageBucket,
} from './primitives'
import { runForecast } from '@/domain/forecast/forecastEngine'
import type { ForecastReport } from '@/domain/forecast/types'
import { formatContextFrom, formatCurrency } from '@/lib/format'
import { expectedToDate, targetForPeriod, type Period } from './periods'
import { computeRepMetrics, teamBenchmarks, type RepMetrics } from './teamMetrics'
import { buildRepTargets } from './repTargets'

export interface CommercialMetrics {
  period: Period
  ownerId: string | null

  // Revenue
  revenue: number
  previousRevenue: number
  revenueDelta: number | null
  target: number
  expectedByNow: number
  attainment: number | null
  /** revenue / expected-by-now. Above 1 means ahead of schedule. */
  pace: number | null
  remainingToTarget: number
  perDayNeeded: number | null

  // Forecast
  forecast: ForecastReport

  // Pipeline
  pipelineTotal: number
  weightedPipeline: number
  openCount: number
  closingInPeriod: Opportunity[]
  closingInPeriodValue: number
  closingNext7Days: Opportunity[]
  coverage: number | null
  stages: StageBucket[]

  // Conversion and deal size
  winRate: number | null
  previousWinRate: number | null
  winRateDelta: number | null
  closedCount: number
  wonCount: number
  averageDealSize: number | null
  previousAverageDealSize: number | null
  averageDealSizeDelta: number | null

  // Team
  reps: RepMetrics[]
  teamAverage: ReturnType<typeof teamBenchmarks>

  // Convenience
  topOpportunities: Opportunity[]
  scopedOpportunities: Opportunity[]
  hasData: boolean
}

/**
 * One pass over the dataset producing every figure the executive views need.
 *
 * Called from a memo so the whole dashboard renders from a single, consistent
 * snapshot: no widget can compute a metric its own way.
 */
export function computeCommercialMetrics(
  dataset: CommercialDataset,
  workspace: Workspace,
  period: Period,
  ownerId: string | null,
): CommercialMetrics {
  const scoped = byOwner(dataset.opportunities, ownerId)

  const fullTarget = targetForPeriod(workspace.goals, period)
  // A rep-filtered view is measured against that rep's share of the target.
  const target =
    ownerId && dataset.owners.length > 0 ? fullTarget / dataset.owners.length : fullTarget

  const wonThisPeriod = wonIn(scoped, period)
  const revenue = revenueOf(wonThisPeriod)
  const previousRevenue = revenueOf(wonIn(scoped, period.previous))

  const expectedByNow = expectedToDate(target, period)
  const remainingToTarget = Math.max(0, target - revenue)

  const open = openOpportunities(scoped)
  const closingInPeriod = closingBy(scoped, period.end)
  const closingNext7Days = closingBy(scoped, addDays(period.now, 7))

  const closedThisPeriod = closedIn(scoped, period)
  const closedPreviousPeriod = closedIn(scoped, period.previous)

  const currentWinRate = winRateOf(closedThisPeriod)
  const previousWinRateValue = winRateOf(closedPreviousPeriod)
  const currentAvgDeal = averageDealSize(wonThisPeriod)
  const previousAvgDeal = averageDealSize(wonIn(scoped, period.previous))

  const repTargets = buildRepTargets(workspace, fullTarget)
  const reps = computeRepMetrics(dataset, period, repTargets)

  // The forecast reads activity to assess deal health. Indexing once here keeps
  // it linear rather than scanning every activity per opportunity.
  const activityIndex = new Map<string, typeof dataset.activities>()
  for (const activity of dataset.activities) {
    const list = activityIndex.get(activity.opportunityId)
    if (list) list.push(activity)
    else activityIndex.set(activity.opportunityId, [activity])
  }

  // The engine writes sentences containing figures; it formats them through the
  // workspace's own context so they match every other number on the screen.
  const formatContext = formatContextFrom(
    workspace.preferences,
    workspace.company.currency,
  )

  return {
    period,
    ownerId,

    revenue,
    previousRevenue,
    revenueDelta: deltaRatio(revenue, previousRevenue),
    target,
    expectedByNow,
    attainment: target > 0 ? revenue / target : null,
    pace: expectedByNow > 0 ? revenue / expectedByNow : null,
    remainingToTarget,
    perDayNeeded:
      period.remainingDays > 0 ? remainingToTarget / period.remainingDays : null,

    forecast: runForecast({
      opportunities: scoped,
      // Owners come from the dataset so the rep table and the Team page are
      // always the same roster, never a second copy of it.
      owners: ownerId
        ? dataset.owners.filter((owner) => owner.id === ownerId)
        : dataset.owners,
      period,
      now: period.now,
      target,
      revenue,
      remainingToTarget,
      coverage: pipelineCoverage(pipelineValue(scoped), remainingToTarget),
      pace: expectedByNow > 0 ? revenue / expectedByNow : null,
      winRate: currentWinRate,
      activitiesFor: (opportunityId) => activityIndex.get(opportunityId) ?? [],
      targetFor: (owner) => repTargets.get(owner) ?? 0,
      currency: (value) => formatCurrency(value, formatContext),
    }),

    pipelineTotal: pipelineValue(scoped),
    weightedPipeline: weightedPipelineValue(scoped),
    openCount: open.length,
    closingInPeriod,
    closingInPeriodValue: closingInPeriod.reduce((total, o) => total + o.value, 0),
    closingNext7Days,
    coverage: pipelineCoverage(pipelineValue(scoped), remainingToTarget),
    stages: stageBreakdown(scoped),

    winRate: currentWinRate,
    previousWinRate: previousWinRateValue,
    winRateDelta: deltaPoints(currentWinRate, previousWinRateValue),
    closedCount: closedThisPeriod.length,
    wonCount: wonThisPeriod.length,
    averageDealSize: currentAvgDeal,
    previousAverageDealSize: previousAvgDeal,
    averageDealSizeDelta:
      currentAvgDeal !== null && previousAvgDeal !== null
        ? deltaRatio(currentAvgDeal, previousAvgDeal)
        : null,

    reps,
    teamAverage: teamBenchmarks(reps),

    topOpportunities: [...open]
      .sort((a, b) => weightedValue(b) - weightedValue(a))
      .slice(0, 5),
    scopedOpportunities: scoped,
    hasData: scoped.length > 0,
  }
}
