import { STAGE_LABELS } from '@/domain/commerce'
import { SIGNIFICANT_CONVERSION_DROP } from '@/domain/metrics/funnel'
import { HEALTHY_COVERAGE } from '@/domain/health/commercialHealth'
import { AMPLE_COVERAGE } from '@/domain/metrics/primitives'
import type { AnalyticsMetrics } from '@/domain/metrics/analyticsMetrics'

/**
 * Performance Insights.
 *
 * Deterministic rules over the analytics snapshot: the same figures always
 * produce the same sentences, and every sentence is traceable to a comparison
 * the user can see elsewhere on the page. No model, no external service.
 */
export type InsightTone = 'positive' | 'negative' | 'neutral'

export interface PerformanceInsight {
  id: string
  tone: InsightTone
  title: string
  detail: string
  /** Ranking weight; higher surfaces first. */
  weight: number
}

export interface InsightFormatters {
  currency: (value: number) => string
  percent: (ratio: number, decimals?: number) => string
  points: (ratio: number, decimals?: number) => string
  number: (value: number, decimals?: number) => string
}

/** Magnitude in percentage points, without a sign: the copy states direction. */
const pointsMagnitude = (fmt: InsightFormatters, ratio: number) =>
  `${fmt.number(Math.abs(ratio) * 100, 1)} pp`

/** Below this, a change is noise rather than a finding. */
const REVENUE_MOVE = 0.03
const DEAL_SIZE_MOVE = 0.05
const WIN_RATE_MOVE = 0.03
const CYCLE_MOVE_DAYS = 3
const CONCENTRATION_LIMIT = 0.4

export function generatePerformanceInsights(
  metrics: AnalyticsMetrics,
  fmt: InsightFormatters,
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = []
  const window = metrics.period.label.toLowerCase()

  // --- Revenue against the previous window ---------------------------------
  if (metrics.growthRatio !== null && Math.abs(metrics.growthRatio) >= REVENUE_MOVE) {
    const up = metrics.growthRatio > 0
    insights.push({
      id: 'insight-revenue',
      tone: up ? 'positive' : 'negative',
      title: `Revenue is ${fmt.percent(Math.abs(metrics.growthRatio), 1)} ${up ? 'above' : 'below'} the previous period`,
      detail: `${fmt.currency(metrics.revenue)} against ${fmt.currency(metrics.previousRevenue)}, a change of ${fmt.currency(Math.abs(metrics.growthAbsolute))} over the ${window}.`,
      weight: 90 + Math.abs(metrics.growthRatio) * 40,
    })
  }

  // --- Attainment against the commitment -----------------------------------
  if (metrics.attainment !== null && metrics.target > 0) {
    const behind = metrics.revenue < metrics.expectedByNow
    if (behind && metrics.expectedByNow - metrics.revenue > metrics.target * 0.03) {
      insights.push({
        id: 'insight-attainment',
        tone: 'negative',
        title: `Revenue is ${fmt.currency(metrics.expectedByNow - metrics.revenue)} short of the expected pace`,
        detail: `${fmt.percent(metrics.attainment, 1)} of the commitment for this window is booked, against ${fmt.percent(metrics.expectedByNow / metrics.target, 1)} expected by now.`,
        weight: 88,
      })
    } else if (!behind && metrics.attainment >= 1) {
      insights.push({
        id: 'insight-attainment',
        tone: 'positive',
        title: `The commitment for this window is already covered`,
        detail: `${fmt.currency(metrics.revenue)} booked against a ${fmt.currency(metrics.target)} target, ${fmt.percent(metrics.attainment, 1)} attainment.`,
        weight: 70,
      })
    }
  }

  // --- Average deal size ----------------------------------------------------
  if (
    metrics.averageDealSizeDelta !== null &&
    Math.abs(metrics.averageDealSizeDelta) >= DEAL_SIZE_MOVE &&
    metrics.averageDealSize !== null
  ) {
    const up = metrics.averageDealSizeDelta > 0
    insights.push({
      id: 'insight-deal-size',
      tone: up ? 'positive' : 'neutral',
      title: `Average deal size ${up ? 'increased' : 'decreased'} by ${fmt.percent(Math.abs(metrics.averageDealSizeDelta), 1)}`,
      detail: `${fmt.currency(metrics.averageDealSize)} per won deal against ${fmt.currency(metrics.previousAverageDealSize ?? 0)} in the previous period, across ${metrics.wonCount} won ${metrics.wonCount === 1 ? 'deal' : 'deals'}.`,
      weight: 62,
    })
  }

  // --- Win rate -------------------------------------------------------------
  if (metrics.winRateDelta !== null && Math.abs(metrics.winRateDelta) >= WIN_RATE_MOVE) {
    const up = metrics.winRateDelta > 0
    insights.push({
      id: 'insight-win-rate',
      tone: up ? 'positive' : 'negative',
      title: `Win rate ${up ? 'improved' : 'dropped'} by ${pointsMagnitude(fmt, metrics.winRateDelta)}`,
      detail: `${fmt.percent(metrics.winRate ?? 0, 1)} of the ${metrics.closedCount} deals closed in this window were won, against ${fmt.percent(metrics.previousWinRate ?? 0, 1)} previously.`,
      weight: 78,
    })
  }

  // --- The weakest step of the funnel --------------------------------------
  const worstDrop = [...metrics.conversions]
    .filter(
      (conversion) =>
        conversion.changePoints !== null &&
        conversion.changePoints <= -SIGNIFICANT_CONVERSION_DROP,
    )
    .sort((a, b) => (a.changePoints ?? 0) - (b.changePoints ?? 0))[0]

  if (worstDrop && worstDrop.changePoints !== null) {
    insights.push({
      id: 'insight-conversion',
      tone: 'negative',
      title: `${STAGE_LABELS[worstDrop.from]} to ${STAGE_LABELS[worstDrop.to]} conversion dropped by ${pointsMagnitude(fmt, worstDrop.changePoints)}`,
      detail: `${fmt.percent(worstDrop.rate ?? 0, 1)} of the ${worstDrop.entered} deals that reached ${STAGE_LABELS[worstDrop.from]} moved on, against ${fmt.percent(worstDrop.previousRate ?? 0, 1)} in the previous period.`,
      weight: 84,
    })
  }

  // --- Pipeline coverage ----------------------------------------------------
  if (metrics.coverage !== null) {
    if (metrics.coverage < HEALTHY_COVERAGE) {
      insights.push({
        id: 'insight-coverage',
        tone: 'negative',
        title: `Pipeline coverage is ${fmt.number(metrics.coverage, 1)}x, below the ${HEALTHY_COVERAGE}x threshold`,
        detail: `${fmt.currency(metrics.pipelineTotal)} of open pipeline against ${fmt.currency(metrics.remainingTarget)} still to book. Generating pipeline matters more than closing faster here.`,
        weight: 80,
      })
    } else if (metrics.coverage < AMPLE_COVERAGE) {
      insights.push({
        id: 'insight-coverage',
        tone: 'positive',
        title: `Pipeline coverage is healthy at ${fmt.number(metrics.coverage, 1)}x`,
        detail: `${fmt.currency(metrics.pipelineTotal)} of open pipeline covers the ${fmt.currency(metrics.remainingTarget)} still needed.`,
        weight: 46,
      })
    }
    // Above the ample threshold the ratio says nothing useful, so nothing is
    // reported rather than announcing a meaningless multiple.
  }

  // --- Sales cycle ----------------------------------------------------------
  if (
    metrics.salesCycleDelta !== null &&
    Math.abs(metrics.salesCycleDelta) >= CYCLE_MOVE_DAYS &&
    metrics.salesCycle.average !== null
  ) {
    const longer = metrics.salesCycleDelta > 0
    insights.push({
      id: 'insight-cycle',
      tone: longer ? 'negative' : 'positive',
      title: `Sales cycle is ${fmt.number(Math.abs(metrics.salesCycleDelta), 0)} days ${longer ? 'longer' : 'shorter'} than the previous period`,
      detail: `${fmt.number(metrics.salesCycle.average, 0)} days on average to close, median ${fmt.number(metrics.salesCycle.median ?? 0, 0)} days.`,
      weight: 58,
    })
  }

  // --- Revenue concentration ------------------------------------------------
  if (metrics.concentration && metrics.concentration.share >= CONCENTRATION_LIMIT) {
    insights.push({
      id: 'insight-concentration',
      tone: 'neutral',
      title: `${fmt.percent(metrics.concentration.share, 0)} of revenue came from ${metrics.concentration.names.length} accounts`,
      detail: `${metrics.concentration.names.join(', ')}. Concentration of this size makes the period sensitive to a single account.`,
      weight: 66,
    })
  }

  // --- Dependence on one rep -------------------------------------------------
  if (metrics.ownerId === null && metrics.revenue > 0) {
    const top = [...metrics.reps].sort((a, b) => b.revenue - a.revenue)[0]
    if (top && top.revenue / metrics.revenue >= CONCENTRATION_LIMIT && metrics.reps.length > 2) {
      insights.push({
        id: 'insight-rep-concentration',
        tone: 'neutral',
        title: `${top.owner.name} generated ${fmt.percent(top.revenue / metrics.revenue, 0)} of revenue`,
        detail: `${fmt.currency(top.revenue)} of ${fmt.currency(metrics.revenue)} across a team of ${metrics.reps.length}.`,
        weight: 54,
      })
    }
  }

  return insights.sort((a, b) => b.weight - a.weight).slice(0, 6)
}
