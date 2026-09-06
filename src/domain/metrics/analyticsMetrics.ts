import type { CommercialDataset, Opportunity } from '@/domain/commerce'
import type { Workspace } from '@/domain/workspace'
import {
  averageDealSize,
  byOwner,
  closedIn,
  deltaPoints,
  deltaRatio,
  pipelineCoverage,
  pipelineValue,
  revenueOf,
  salesCycleStats,
  weightedPipelineValue,
  winRateOf,
  wonIn,
  type SalesCycleStats,
} from './primitives'
import { buildFunnel, stageConversions, type FunnelStageStat, type StageConversion } from './funnel'
import { customerStats, revenueConcentration, type CustomerStat } from './customers'
import { computeRepMetrics, type RepMetrics } from './teamMetrics'
import { buildRepTargets } from './repTargets'
import type { AnalyticsPeriod } from './ranges'

/**
 * The analytics snapshot.
 *
 * Built from the same primitives as the dashboard, so revenue, win rate,
 * pipeline and average deal size cannot differ between the two screens. Only
 * the window differs, and that is stated on screen.
 */
export interface AnalyticsMetrics {
  period: AnalyticsPeriod
  ownerId: string | null

  revenue: number
  previousRevenue: number
  growthAbsolute: number
  growthRatio: number | null

  target: number
  expectedByNow: number
  attainment: number | null
  /** Same commitment, previous window: the windows are equal length. */
  previousAttainment: number | null
  /** Change in percentage points. */
  attainmentDelta: number | null
  /** revenue - target. Negative means short of the commitment. */
  gap: number

  winRate: number | null
  previousWinRate: number | null
  winRateDelta: number | null

  averageDealSize: number | null
  previousAverageDealSize: number | null
  averageDealSizeDelta: number | null

  salesCycle: SalesCycleStats
  previousSalesCycle: SalesCycleStats
  salesCycleDelta: number | null

  pipelineTotal: number
  weightedPipeline: number
  openCount: number
  remainingTarget: number
  coverage: number | null

  wonCount: number
  closedCount: number

  funnel: FunnelStageStat[]
  conversions: StageConversion[]
  reps: RepMetrics[]
  customers: CustomerStat[]
  concentration: ReturnType<typeof revenueConcentration>

  scoped: Opportunity[]
  hasData: boolean
}

export function computeAnalyticsMetrics(
  dataset: CommercialDataset,
  workspace: Workspace,
  period: AnalyticsPeriod,
  ownerId: string | null,
): AnalyticsMetrics {
  const scoped = byOwner(dataset.opportunities, ownerId)

  // Scoping to one rep measures them against their share of the commitment,
  // exactly as the dashboard does.
  const target =
    ownerId && dataset.owners.length > 0 ? period.target / dataset.owners.length : period.target
  const expectedByNow =
    ownerId && dataset.owners.length > 0
      ? period.expectedByNow / dataset.owners.length
      : period.expectedByNow

  const wonThisPeriod = wonIn(scoped, period)
  const wonPreviousPeriod = wonIn(scoped, period.previous)
  const revenue = revenueOf(wonThisPeriod)
  const previousRevenue = revenueOf(wonPreviousPeriod)

  const closedThisPeriod = closedIn(scoped, period)
  const closedPreviousPeriod = closedIn(scoped, period.previous)

  const winRate = winRateOf(closedThisPeriod)
  const previousWinRate = winRateOf(closedPreviousPeriod)

  const avgDeal = averageDealSize(wonThisPeriod)
  const previousAvgDeal = averageDealSize(wonPreviousPeriod)

  const cycle = salesCycleStats(wonThisPeriod)
  const previousCycle = salesCycleStats(wonPreviousPeriod)

  const remainingTarget = Math.max(0, target - revenue)
  const pipeline = pipelineValue(scoped)

  const customers = customerStats(scoped, dataset.customers, period)

  return {
    period,
    ownerId,

    revenue,
    previousRevenue,
    growthAbsolute: revenue - previousRevenue,
    growthRatio: deltaRatio(revenue, previousRevenue),

    target,
    expectedByNow,
    attainment: target > 0 ? revenue / target : null,
    previousAttainment: target > 0 ? previousRevenue / target : null,
    attainmentDelta:
      target > 0 ? deltaPoints(revenue / target, previousRevenue / target) : null,
    gap: revenue - target,

    winRate,
    previousWinRate,
    winRateDelta: deltaPoints(winRate, previousWinRate),

    averageDealSize: avgDeal,
    previousAverageDealSize: previousAvgDeal,
    averageDealSizeDelta:
      avgDeal !== null && previousAvgDeal !== null
        ? deltaRatio(avgDeal, previousAvgDeal)
        : null,

    salesCycle: cycle,
    previousSalesCycle: previousCycle,
    salesCycleDelta:
      cycle.average !== null && previousCycle.average !== null
        ? cycle.average - previousCycle.average
        : null,

    pipelineTotal: pipeline,
    weightedPipeline: weightedPipelineValue(scoped),
    openCount: scoped.filter(
      (opportunity) => opportunity.stage !== 'won' && opportunity.stage !== 'lost',
    ).length,
    remainingTarget,
    coverage: pipelineCoverage(pipeline, remainingTarget),

    wonCount: wonThisPeriod.length,
    closedCount: closedThisPeriod.length,

    funnel: buildFunnel(scoped, period),
    conversions: stageConversions(scoped, period, period.previous),
    reps: computeRepMetrics(dataset, period, buildRepTargets(workspace, period.target)),
    customers,
    concentration: revenueConcentration(customers),

    scoped,
    hasData: scoped.length > 0,
  }
}
