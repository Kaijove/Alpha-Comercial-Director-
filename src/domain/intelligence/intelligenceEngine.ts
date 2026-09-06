import type { Activity, CommercialDataset } from '@/domain/commerce'
import type { Workspace } from '@/domain/workspace'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { customerStats, type CustomerStat } from '@/domain/metrics/customers'
import {
  teamBenchmarks,
  type RepMetrics,
  type TeamBenchmarks,
} from '@/domain/metrics/teamMetrics'
import {
  assessCommercialHealth,
  type CommercialHealth,
} from '@/domain/health/commercialHealth'
import { assessRepPerformance } from '@/domain/team/teamPerformanceEngine'
import { computeBaseline, detectAnomalies, type Baseline } from './anomalyEngine'
import { forecastRules } from './forecastRules'
import { finalise } from './priorityEngine'
import { positiveRules } from './positiveRules'
import {
  closingSoonRule,
  computeRevenueAtRisk,
  customerConcentrationRule,
  pipelineGapRule,
  revenueAtRiskRules,
  stalledDealRule,
  targetRiskRule,
  type RevenueAtRiskReport,
} from './riskRules'
import { scorePipeline, type ScoredOpportunity } from './opportunityScoring'
import { teamRules } from './teamRules'
import { INTELLIGENCE_THRESHOLDS as T } from './thresholds'
import type { IntelligenceContext, IntelligenceFormatters } from './context'
import type { Insight, InsightStatus } from './types'
import { SEVERITY_ORDER } from './types'

/**
 * The intelligence engine.
 *
 *   commercial data -> deterministic rules -> Insight[] -> UI
 *
 * Every rule reads the shared metrics layer, so nothing here defines revenue,
 * pipeline or win rate for itself. The output is a plain array of structured
 * insights: no component ever runs a rule, and an optional interpretation layer
 * could be inserted between this function and the screen without touching a
 * single component.
 *
 * Same data plus same rules always produces the same insights, in the same
 * order, with the same ids.
 */
export interface IntelligenceOverview {
  criticalCount: number
  highCount: number
  revenueAtRisk: number
  opportunitiesNeedingAttention: number
  positiveCount: number
  unresolvedCount: number
}

export interface IntelligenceResult {
  insights: Insight[]
  health: CommercialHealth
  revenueAtRisk: RevenueAtRiskReport
  scored: ScoredOpportunity[]
  reps: RepMetrics[]
  benchmarks: TeamBenchmarks
  customers: CustomerStat[]
  baseline: Baseline
  overview: IntelligenceOverview
  /** True when there is not enough history for the anomaly rules to speak. */
  anomaliesUnavailable: boolean
}

export interface IntelligenceInput {
  dataset: CommercialDataset
  workspace: Workspace
  metrics: CommercialMetrics
  now: Date
  fmt: IntelligenceFormatters
  activitiesFor: (opportunityId: string) => Activity[]
  customerName: (id: string) => string
  ownerName: (id: string) => string
  /** Persisted statuses, applied after generation. */
  statuses: Record<string, InsightStatus>
}

export function runIntelligence(input: IntelligenceInput): IntelligenceResult {
  const { dataset, workspace, metrics, now, fmt, statuses } = input

  // --- Shared inputs, computed once ---------------------------------------
  const scored = scorePipeline(dataset.opportunities, input.activitiesFor, now)
  // The metrics snapshot already carries per-rep figures, computed against each
  // rep's share of the *full* team commitment. Recomputing them here cost a
  // second pass over the whole dataset on every render, and used the
  // owner-scoped target, which would have given a rep a different target here
  // than on the Team page the moment a filter was applied.
  const reps = metrics.reps
  const benchmarks = teamBenchmarks(reps)
  const customers = customerStats(dataset.opportunities, dataset.customers, metrics.period)

  const context: IntelligenceContext = {
    now,
    workspace,
    dataset,
    metrics,
    scored,
    reps,
    benchmarks,
    customers,
    customerName: input.customerName,
    ownerName: input.ownerName,
    fmt,
  }

  const revenueAtRisk = computeRevenueAtRisk(context)
  const baseline = computeBaseline(dataset, now)

  // --- Rules ---------------------------------------------------------------
  const drafts = [
    ...revenueAtRiskRules(context, revenueAtRisk),
    ...targetRiskRule(context),
    ...forecastRules(context),
    ...pipelineGapRule(context),
    ...stalledDealRule(context),
    ...closingSoonRule(context),
    ...customerConcentrationRule(context),
    ...teamRules(context),
    ...detectAnomalies(context, baseline),
    ...positiveRules(context),
  ]

  const insights = drafts
    .map((draft) => finalise(draft, metrics.target))
    .map((insight) => ({ ...insight, status: statuses[insight.id] ?? 'new' }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.priorityScore - a.priorityScore,
    )

  // --- Health, sharpened with what the engine just learned ------------------
  const openCount = scored.length
  const stalledRatio =
    openCount > 0
      ? scored.filter((entry) => entry.health.inactiveDays >= T.stalledDays).length /
        openCount
      : null

  const health = assessCommercialHealth(metrics, {
    revenueAtRiskRatio:
      metrics.remainingToTarget > 0
        ? revenueAtRisk.total / metrics.remainingToTarget
        : null,
    stalledRatio,
    teamAtRiskRatio:
      reps.length > 0
        ? reps.filter((rep) => {
            const status = assessRepPerformance({
              rep,
              benchmarks,
              elapsedFraction: metrics.period.elapsedFraction,
            }).status
            return status === 'at-risk' || status === 'attention'
          }).length / reps.length
        : null,
  })

  const live = insights.filter(
    (insight) => insight.status !== 'dismissed' && insight.status !== 'resolved',
  )

  return {
    insights,
    health,
    revenueAtRisk,
    scored,
    reps,
    benchmarks,
    customers,
    baseline,
    anomaliesUnavailable: !baseline.sufficient,
    overview: {
      criticalCount: live.filter((insight) => insight.severity === 'critical').length,
      highCount: live.filter((insight) => insight.severity === 'high').length,
      revenueAtRisk: revenueAtRisk.total,
      // Everything below the healthy band: the label says "needing attention",
      // so it counts what needs attention, not only what is already lost.
      opportunitiesNeedingAttention: scored.filter(
        (entry) => entry.health.band !== 'healthy',
      ).length,
      positiveCount: live.filter((insight) => insight.severity === 'positive').length,
      unresolvedCount: live.length,
    },
  }
}
