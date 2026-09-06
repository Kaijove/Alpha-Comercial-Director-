import { clamp100, interpolate } from '@/domain/metrics/curve'
import { FORECAST_CONFIG as C } from './forecastConfig'
import type {
  ConfidenceFactor,
  ForecastContribution,
  ForecastGap,
  ForecastState,
  PathToTarget,
  TargetProbability,
} from './types'

/**
 * Probability of reaching target, the forecast gap, and what would have to
 * happen to close it.
 *
 * The probability is not a simulation and not a random draw. It is a weighted
 * blend of five measurable things, each mapped through an explicit curve:
 *
 *   forecast vs target 45% · coverage 20% · pace 15% · conversion 10% · health 10%
 *
 * The forecast gap dominates, as it should - but a forecast that lands on
 * target with thin coverage and a team behind pace is a less certain thing than
 * the same number with pipeline behind it, and the score says so.
 */
export interface ProjectionInput {
  baseForecast: number
  target: number
  revenue: number
  remainingToTarget: number
  coverage: number | null
  pace: number | null
  winRate: number | null
  historicalWinRate: number | null
  contributions: ForecastContribution[]
  openForecast: number
}

export function targetProbability(input: ProjectionInput): TargetProbability {
  const { baseForecast, target, coverage, pace, winRate, contributions, openForecast } = input

  const factors: ConfidenceFactor[] = []

  // --- The forecast against the commitment ---------------------------------
  const gapRatio = target > 0 ? (baseForecast - target) / target : null
  factors.push({
    key: 'banked',
    label: 'Forecast against target',
    weight: C.probabilityWeights.forecastGap,
    value: gapRatio,
    score: interpolate(
      [
        [-0.3, 3],
        [-0.15, 18],
        [-0.05, 42],
        [0, 60],
        [0.05, 78],
        [0.15, 92],
        [0.3, 98],
      ],
      gapRatio,
    ),
    detail:
      gapRatio === null
        ? 'No target has been set for this period.'
        : gapRatio >= 0
          ? 'The base forecast already lands above target.'
          : `The base forecast lands ${Math.round(Math.abs(gapRatio) * 100)}% below target.`,
  })

  // --- Is there enough pipeline to make up a shortfall ---------------------
  factors.push({
    key: 'coverage',
    label: 'Pipeline coverage',
    weight: C.probabilityWeights.coverage,
    value: coverage,
    score: interpolate(
      [
        [0.5, 8],
        [1, 30],
        [2, 60],
        [3, 88],
        [4, 100],
      ],
      coverage,
    ),
    detail:
      coverage === null
        ? 'The target is already covered by closed revenue.'
        : `Open pipeline covers what is left of the target ${coverage.toFixed(1)} times over.`,
  })

  // --- Is the period running to schedule -----------------------------------
  factors.push({
    key: 'quality',
    label: 'Current pace',
    weight: C.probabilityWeights.pace,
    value: pace,
    score: interpolate(
      [
        [0.6, 10],
        [0.85, 42],
        [1, 74],
        [1.15, 92],
        [1.3, 100],
      ],
      pace,
    ),
    detail:
      pace === null
        ? 'No target pace to measure against.'
        : pace >= 1
          ? 'Revenue is running ahead of the pace the period needs.'
          : 'Revenue is behind the pace the period needs.',
  })

  // --- Does the team convert at the rate this requires ---------------------
  factors.push({
    key: 'highConfidenceShare',
    label: 'Conversion',
    weight: C.probabilityWeights.conversion,
    value: winRate,
    score: interpolate(
      [
        [0.1, 15],
        [0.25, 45],
        [0.4, 72],
        [0.55, 92],
        [0.7, 100],
      ],
      winRate,
    ),
    detail:
      winRate === null
        ? 'Not enough closed deals this period to read a conversion rate.'
        : `Deals are converting at ${Math.round(winRate * 100)}%.`,
  })

  // --- Is what has to close actually being worked --------------------------
  const healthyShare =
    openForecast > 0
      ? contributions
          .filter((entry) => entry.health.band === 'healthy')
          .reduce((total, entry) => total + entry.contribution, 0) / openForecast
      : null
  factors.push({
    key: 'health',
    label: 'Health of the deals counted',
    weight: C.probabilityWeights.health,
    value: healthyShare,
    score: interpolate(
      [
        [0, 12],
        [0.35, 45],
        [0.6, 72],
        [0.85, 95],
        [1, 100],
      ],
      healthyShare,
    ),
    detail:
      healthyShare === null
        ? 'No open deals are being counted toward the period.'
        : `${Math.round(healthyShare * 100)}% of the projected pipeline revenue is in healthy deals.`,
  })

  const rawTotal = factors.reduce((total, factor) => total + factor.weight, 0)
  for (const factor of factors) factor.weight = factor.weight / rawTotal

  const score = Math.round(
    clamp100(factors.reduce((total, factor) => total + factor.score * factor.weight, 0)),
  )

  return { score, factors, summary: probabilitySummary(input, score) }
}

function probabilitySummary(input: ProjectionInput, score: number): string {
  const { baseForecast, target, contributions } = input
  const shortfall = target - baseForecast

  const healthyOpen = contributions
    .filter((entry) => entry.health.band === 'healthy' || entry.health.band === 'attention')
    .reduce((total, entry) => total + entry.value, 0)

  if (shortfall <= 0) {
    return score >= 70
      ? 'The base forecast already covers the target, with pipeline and pace behind it.'
      : 'The base forecast covers the target, but coverage and pace leave less margin than the number suggests.'
  }

  if (healthyOpen >= shortfall) {
    return `The forecast is short of target, but there is enough healthy open pipeline to cover the difference if it converts.`
  }

  return 'Target probability is low because the remaining target exceeds what the open pipeline is expected to convert.'
}

// ---------------------------------------------------------------------------
// Gap
// ---------------------------------------------------------------------------

export function assessGap(
  baseForecast: number,
  target: number,
  confidence: number,
): ForecastGap {
  const amount = baseForecast - target
  const ratio = target > 0 ? amount / target : null
  const additionalRequired = Math.max(0, -amount)

  const state = gapState(ratio, confidence)

  const label =
    state === 'above-target'
      ? 'Above Target'
      : state === 'on-track'
        ? 'On Track'
        : state === 'at-risk'
          ? 'At Risk'
          : 'Critical'

  return {
    state,
    label,
    amount,
    ratio,
    additionalRequired,
    summary: gapSummary(state, amount, ratio, confidence),
  }
}

/**
 * The state is not read off the gap alone. A forecast that lands on target but
 * cannot be relied on is not "on track", and saying so would be the most
 * expensive kind of false comfort.
 */
function gapState(ratio: number | null, confidence: number): ForecastState {
  if (ratio === null) return 'on-track'

  if (ratio >= 0) {
    return confidence < C.confidence.moderate ? 'at-risk' : 'above-target'
  }
  if (Math.abs(ratio) <= C.gap.near) {
    return confidence < C.confidence.moderate ? 'at-risk' : 'on-track'
  }
  if (Math.abs(ratio) >= C.gap.critical) return 'critical'
  return 'at-risk'
}

function gapSummary(
  state: ForecastState,
  amount: number,
  ratio: number | null,
  confidence: number,
): string {
  const pct = ratio === null ? null : `${Math.abs(Math.round(ratio * 1000) / 10)}%`

  if (state === 'above-target') {
    return `The forecast lands above target${pct ? ` by ${pct}` : ''}.`
  }
  if (state === 'on-track') {
    return amount >= 0
      ? 'The forecast lands on target.'
      : `The forecast lands just short of target${pct ? `, ${pct} below` : ''}.`
  }
  if (state === 'critical') {
    return `The forecast lands well short of target${pct ? `, ${pct} below` : ''}.`
  }
  return amount >= 0 || confidence >= C.confidence.moderate
    ? `The forecast is below target${pct ? ` by ${pct}` : ''}.`
    : `The forecast reaches target only on assumptions that confidence does not support.`
}

// ---------------------------------------------------------------------------
// Path to target
// ---------------------------------------------------------------------------

/**
 * What would actually have to happen.
 *
 * Deals are taken at their **full value**, not their weighted contribution:
 * this answers "which deals closing would cover the gap", and a deal that
 * closes brings in all of its value, not 60% of it. The largest, most likely
 * deals are considered first, so the answer is the smallest credible set rather
 * than a long tail.
 *
 * It never promises any particular deal will close.
 */
export function buildPath(
  contributions: ForecastContribution[],
  gap: ForecastGap,
): PathToTarget {
  const highConfidenceValue = contributions
    .filter((entry) => entry.probability >= C.highConfidenceProbability)
    .reduce((total, entry) => total + entry.value, 0)

  if (gap.additionalRequired <= 0) {
    return {
      required: 0,
      deals: [],
      needed: 0,
      candidates: contributions.length,
      highConfidenceValue,
      reachable: true,
      summary: 'The base forecast already covers the target; the pipeline below is upside.',
    }
  }

  // Rank by how much a close would move the number, weighted by how likely and
  // how healthy the deal is - the fewest deals a director would actually chase.
  const ranked = [...contributions].sort(
    (a, b) =>
      b.value * b.probability * b.healthFactor - a.value * a.probability * a.healthFactor,
  )

  const chosen: ForecastContribution[] = []
  let covered = 0
  for (const entry of ranked) {
    if (covered >= gap.additionalRequired) break
    chosen.push(entry)
    covered += entry.value
  }

  const reachable = covered >= gap.additionalRequired

  return {
    required: gap.additionalRequired,
    // Show a little more than the minimum so the director has a choice.
    deals: ranked.slice(0, Math.min(ranked.length, Math.max(chosen.length + 2, 4))),
    needed: chosen.length,
    candidates: ranked.length,
    highConfidenceValue,
    reachable,
    summary: reachable
      ? `Closing ${chosen.length} of the ${Math.min(ranked.length, Math.max(chosen.length + 2, 4))} opportunities below would cover the remaining gap.`
      : 'No combination of the open pipeline covers the gap inside this period; the shortfall needs pipeline that does not exist yet.',
  }
}
