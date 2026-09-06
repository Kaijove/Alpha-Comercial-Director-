import { interpolate, type CurvePoint } from '@/domain/metrics/curve'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'

/**
 * Commercial Health.
 *
 * A single executive read on the state of the business, combining four
 * independent signals rather than dressing up one KPI. Fully deterministic:
 * the same metrics always produce the same score, status and explanation.
 */
export type HealthStatus =
  | 'healthy'
  | 'on-track'
  | 'attention'
  | 'at-risk'
  | 'critical'

export interface HealthSignal {
  key: 'pace' | 'forecast' | 'coverage' | 'trend' | 'exposure' | 'execution' | 'team'
  label: string
  /** 0-100 contribution before weighting. */
  score: number
  /** Share of the final score, already renormalised so the set sums to 1. */
  weight: number
  /** Human sentence used when this signal is the weakest link. */
  detail: string
  /** Raw value, for tooltips and later drill-down. */
  value: number | null
}

export interface CommercialHealth {
  status: HealthStatus
  label: string
  /** 0-100. */
  score: number
  summary: string
  signals: HealthSignal[]
}

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  'on-track': 'On Track',
  attention: 'Attention',
  'at-risk': 'At Risk',
  critical: 'Critical',
}

/**
 * Signals the intelligence engine can supply on top of the four core ones.
 *
 * Optional so the health read is identical whether it is asked for with or
 * without them - the four core signals always carry most of the weight, and the
 * extras sharpen it rather than replacing it.
 */
export interface HealthExtras {
  /** Weighted revenue at risk over what is left of the target, 0..n. */
  revenueAtRiskRatio?: number | null
  /** Share of open deals that have gone quiet, 0..1. */
  stalledRatio?: number | null
  /** Share of the roster below expected performance, 0..1. */
  teamAtRiskRatio?: number | null
}

/** Coverage the business is expected to keep to stay comfortable. */
export const HEALTHY_COVERAGE = 3

/**
 * Maps a value onto 0-100 through an explicit, readable curve.
 *
 * Shared with the forecast engine so the two never drift apart in how they turn
 * a ratio into a score.
 */
const scoreOn = (points: CurvePoint[], value: number | null): number =>
  interpolate(points, value)

export function assessCommercialHealth(
  metrics: CommercialMetrics,
  extras: HealthExtras = {},
): CommercialHealth {
  const paceScore = scoreOn(
    [
      [0.6, 8],
      [0.8, 42],
      [0.95, 76],
      [1, 88],
      [1.1, 100],
    ],
    metrics.pace,
  )

  const forecastScore = scoreOn(
    [
      [0.7, 10],
      [0.85, 44],
      [0.95, 72],
      [1, 88],
      [1.08, 100],
    ],
    metrics.forecast.attainment,
  )

  const coverageScore = scoreOn(
    [
      [0.5, 8],
      [1, 32],
      [2, 64],
      [HEALTHY_COVERAGE, 92],
      [4, 100],
    ],
    metrics.coverage,
  )

  const trendScore = scoreOn(
    [
      [-0.4, 6],
      [-0.15, 38],
      [0, 68],
      [0.1, 88],
      [0.25, 100],
    ],
    metrics.revenueDelta,
  )

  const periodWord =
    metrics.period.key === 'mtd'
      ? 'month'
      : metrics.period.key === 'qtd'
        ? 'quarter'
        : metrics.period.key === 'ytd'
          ? 'year'
          : 'period'

  const signals: HealthSignal[] = [
    {
      key: 'pace',
      label: 'Target pace',
      score: paceScore,
      weight: 0.35,
      value: metrics.pace,
      detail:
        metrics.pace === null
          ? 'No target has been set for this period.'
          : metrics.pace >= 1
            ? `Revenue is running ahead of the pace needed for the ${periodWord}.`
            : `Revenue is behind the pace needed to reach the ${periodWord}'s target.`,
    },
    {
      key: 'forecast',
      label: 'Forecast vs target',
      score: forecastScore,
      weight: 0.25,
      value: metrics.forecast.attainment,
      detail:
        metrics.forecast.gap >= 0
          ? 'The current forecast lands above target.'
          : 'The current forecast lands below target.',
    },
    {
      key: 'coverage',
      label: 'Pipeline coverage',
      score: coverageScore,
      weight: 0.25,
      value: metrics.coverage,
      detail:
        metrics.coverage === null
          ? 'The target is already covered by closed revenue.'
          : metrics.coverage >= HEALTHY_COVERAGE
            ? 'Pipeline comfortably covers what is left of the target.'
            : 'Pipeline closing inside the period is thin against the remaining target.',
    },
    {
      key: 'trend',
      label: 'Revenue trend',
      score: trendScore,
      weight: 0.15,
      value: metrics.revenueDelta,
      detail:
        (metrics.revenueDelta ?? 0) >= 0
          ? 'Revenue is up on the same point of the previous period.'
          : 'Revenue is down on the same point of the previous period.',
    },
  ]

  // --- Optional signals from the intelligence engine ----------------------
  if (extras.revenueAtRiskRatio !== undefined && extras.revenueAtRiskRatio !== null) {
    signals.push({
      key: 'exposure',
      label: 'Revenue at risk',
      weight: 0.12,
      value: extras.revenueAtRiskRatio,
      score: scoreOn(
        [
          [0, 100],
          [0.15, 78],
          [0.35, 46],
          [0.6, 18],
          [1, 5],
        ],
        extras.revenueAtRiskRatio,
      ),
      detail:
        extras.revenueAtRiskRatio <= 0.15
          ? 'Little of what is left of the target is exposed to at-risk deals.'
          : 'A material share of the remaining target sits in deals flagged at risk.',
    })
  }

  if (extras.stalledRatio !== undefined && extras.stalledRatio !== null) {
    signals.push({
      key: 'execution',
      label: 'Pipeline execution',
      weight: 0.1,
      value: extras.stalledRatio,
      score: scoreOn(
        [
          [0, 100],
          [0.15, 76],
          [0.3, 48],
          [0.5, 20],
          [0.7, 6],
        ],
        extras.stalledRatio,
      ),
      detail:
        extras.stalledRatio <= 0.15
          ? 'Open deals are being worked; very few have gone quiet.'
          : 'A large share of the open pipeline has had no recent activity.',
    })
  }

  if (extras.teamAtRiskRatio !== undefined && extras.teamAtRiskRatio !== null) {
    signals.push({
      key: 'team',
      label: 'Team delivery',
      weight: 0.1,
      value: extras.teamAtRiskRatio,
      score: scoreOn(
        [
          [0, 100],
          [0.25, 78],
          [0.5, 50],
          [0.75, 24],
          [1, 8],
        ],
        extras.teamAtRiskRatio,
      ),
      detail:
        extras.teamAtRiskRatio <= 0.25
          ? 'Most of the team is tracking at or above expectation.'
          : 'A large share of the team is behind where the period expects them to be.',
    })
  }

  // Weights are renormalised so adding a signal cannot deflate the score, and
  // the renormalised share is what each signal reports: a caller reading the
  // array sees the weight actually applied, not the one written above.
  const rawTotal = signals.reduce((total, signal) => total + signal.weight, 0)
  for (const signal of signals) {
    signal.weight = signal.weight / rawTotal
  }

  const score = Math.round(
    signals.reduce((total, signal) => total + signal.score * signal.weight, 0),
  )

  const status: HealthStatus =
    score >= 80
      ? 'healthy'
      : score >= 65
        ? 'on-track'
        : score >= 48
          ? 'attention'
          : score >= 30
            ? 'at-risk'
            : 'critical'

  const weakest = [...signals].sort((a, b) => a.score - b.score)[0]
  const strongest = [...signals].sort((a, b) => b.score - a.score)[0]

  const summary =
    status === 'healthy'
      ? `${strongest.detail} Nothing on the main indicators needs intervention today.`
      : `${weakest.detail} ${strongest.detail}`

  return { status, label: HEALTH_LABELS[status], score, summary, signals }
}
