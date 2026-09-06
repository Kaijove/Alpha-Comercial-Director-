import type { RepMetrics, TeamBenchmarks } from '@/domain/metrics/teamMetrics'
import { HEALTHY_COVERAGE } from '@/domain/health/commercialHealth'

/**
 * Performance status for a single rep.
 *
 * Deliberately multi-dimensional: attainment alone would punish someone who is
 * building a strong pipeline early in a period and reward someone coasting on
 * one lucky deal. Five signals are scored and weighted, and the result carries
 * the reasons that produced it so a director can argue with the conclusion.
 *
 * No model, no randomness: the same figures always yield the same status.
 */
export type PerformanceStatus = 'on-track' | 'attention' | 'at-risk' | 'no-data'

export interface PerformanceSignal {
  key: 'attainment' | 'pace' | 'coverage' | 'conversion' | 'trend'
  label: string
  /** 0-100 before weighting. */
  score: number
  weight: number
  detail: string
}

export interface RepPerformance {
  status: PerformanceStatus
  label: string
  /** 0-100. */
  score: number
  signals: PerformanceSignal[]
  /** The weakest signal, which is what the UI leads with. */
  weakest: PerformanceSignal | null
}

export const PERFORMANCE_LABELS: Record<PerformanceStatus, string> = {
  'on-track': 'On Track',
  attention: 'Attention',
  'at-risk': 'At Risk',
  'no-data': 'No Data',
}

export const PERFORMANCE_ORDER: Record<PerformanceStatus, number> = {
  'at-risk': 0,
  attention: 1,
  'on-track': 2,
  'no-data': 3,
}

/** Maps a value onto 0-100 through an explicit, readable curve. */
function scoreOn(points: [number, number][], value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 55
  const sorted = [...points].sort((a, b) => a[0] - b[0])
  if (value <= sorted[0][0]) return sorted[0][1]
  if (value >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1]
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [x1, y1] = sorted[i]
    const [x2, y2] = sorted[i + 1]
    if (value >= x1 && value <= x2) {
      return y1 + ((value - x1) / (x2 - x1)) * (y2 - y1)
    }
  }
  return 55
}

export interface PerformanceInput {
  rep: RepMetrics
  benchmarks: TeamBenchmarks
  /** 0..1 share of the period already elapsed, for the pace signal. */
  elapsedFraction: number
}

export function assessRepPerformance({
  rep,
  benchmarks,
  elapsedFraction,
}: PerformanceInput): RepPerformance {
  // Nothing to judge: no revenue, no pipeline, no closed deals.
  if (rep.revenue === 0 && rep.pipeline === 0 && rep.wonCount + rep.lostCount === 0) {
    return {
      status: 'no-data',
      label: PERFORMANCE_LABELS['no-data'],
      score: 0,
      signals: [],
      weakest: null,
    }
  }

  const attainment = rep.attainment ?? 0
  const expected = Math.max(0.05, elapsedFraction)
  const pace = rep.target > 0 ? attainment / expected : null

  const signals: PerformanceSignal[] = [
    {
      key: 'attainment',
      label: 'Target attainment',
      weight: 0.3,
      score: scoreOn(
        [
          [0.4, 10],
          [0.7, 45],
          [0.9, 72],
          [1, 88],
          [1.15, 100],
        ],
        rep.attainment,
      ),
      detail:
        rep.attainment === null
          ? 'No target set for this rep.'
          : `${Math.round(attainment * 100)}% of their target for the period.`,
    },
    {
      key: 'pace',
      label: 'Pace',
      weight: 0.22,
      score: scoreOn(
        [
          [0.6, 10],
          [0.85, 45],
          [1, 82],
          [1.15, 100],
        ],
        pace,
      ),
      detail:
        pace === null
          ? 'Pace cannot be measured without a target.'
          : pace >= 1
            ? 'Ahead of the pace needed for the period.'
            : 'Behind the pace needed for the period.',
    },
    {
      key: 'coverage',
      label: 'Pipeline coverage',
      weight: 0.22,
      score:
        rep.coverage === null
          ? 95 // Target already covered by closed revenue.
          : scoreOn(
              [
                [0.5, 8],
                [1, 32],
                [2, 62],
                [HEALTHY_COVERAGE, 92],
                [4, 100],
              ],
              rep.coverage,
            ),
      detail:
        rep.coverage === null
          ? 'Target already covered by closed revenue.'
          : rep.coverage >= HEALTHY_COVERAGE
            ? 'Enough open pipeline to cover what is left.'
            : `Open pipeline covers only ${rep.coverage.toFixed(1)}x what is left of their target.`,
    },
    {
      key: 'conversion',
      label: 'Win rate',
      weight: 0.16,
      score:
        rep.winRate === null
          ? 55
          : scoreOn(
              [
                [-0.2, 12],
                [-0.08, 40],
                [0, 68],
                [0.08, 88],
                [0.2, 100],
              ],
              rep.winRate - (benchmarks.winRate ?? rep.winRate),
            ),
      detail:
        rep.winRate === null
          ? 'No closed deals in this period.'
          : benchmarks.winRate === null
            ? `Win rate of ${Math.round(rep.winRate * 100)}%.`
            : `${Math.round(rep.winRate * 100)}% against a team average of ${Math.round(benchmarks.winRate * 100)}%.`,
    },
    {
      key: 'trend',
      label: 'Revenue trend',
      weight: 0.1,
      score: scoreOn(
        [
          [-0.4, 8],
          [-0.15, 38],
          [0, 68],
          [0.15, 92],
          [0.3, 100],
        ],
        rep.revenueDelta,
      ),
      detail:
        rep.revenueDelta === null
          ? 'No comparable previous period.'
          : rep.revenueDelta >= 0
            ? 'Revenue is up on the previous period.'
            : 'Revenue is down on the previous period.',
    },
  ]

  const score = Math.round(
    signals.reduce((total, signal) => total + signal.score * signal.weight, 0),
  )

  const status: PerformanceStatus =
    score >= 70 ? 'on-track' : score >= 48 ? 'attention' : 'at-risk'

  const weakest = [...signals].sort((a, b) => a.score - b.score)[0] ?? null

  return { status, label: PERFORMANCE_LABELS[status], score, signals, weakest }
}
