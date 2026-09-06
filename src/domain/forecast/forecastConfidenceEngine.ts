import { clamp100, interpolate } from '@/domain/metrics/curve'
import { FORECAST_CONFIG as C } from './forecastConfig'
import type {
  ConfidenceFactor,
  ForecastConfidence,
  ForecastContribution,
  ForecastDataQuality,
} from './types'

/**
 * How much weight the forecast deserves, 0-100.
 *
 * Separate from the forecast value on purpose: a 500k forecast resting entirely
 * on three deals closing in the last fortnight is a very different statement
 * from a 500k forecast that is 80% already banked, and a director needs to be
 * able to tell those apart at a glance.
 *
 * Six factors, each scored 0-100 through an explicit curve and weighted. Only
 * factors that can actually be measured take part; the weights are renormalised
 * over whatever is available, so a missing input never quietly deflates the
 * score.
 */
export interface ConfidenceInput {
  closedRevenue: number
  baseForecast: number
  contributions: ForecastContribution[]
  quality: ForecastDataQuality
  coverage: number | null
}

export function assessConfidence(input: ConfidenceInput): ForecastConfidence {
  const { closedRevenue, baseForecast, contributions, quality, coverage } = input
  const openForecast = Math.max(0, baseForecast - closedRevenue)

  const factors: ConfidenceFactor[] = []
  const push = (factor: Omit<ConfidenceFactor, 'weight'>) =>
    factors.push({ ...factor, weight: C.confidenceWeights[factor.key] })

  // --- How much is already money, not a projection -------------------------
  const banked = baseForecast > 0 ? closedRevenue / baseForecast : null
  push({
    key: 'banked',
    label: 'Revenue already banked',
    value: banked,
    score: interpolate(
      [
        [0, 12],
        [0.25, 40],
        [0.5, 68],
        [0.75, 88],
        [1, 100],
      ],
      banked,
    ),
    detail:
      banked === null
        ? 'No forecast to attribute yet.'
        : `${Math.round(banked * 100)}% of the forecast is revenue already won.`,
  })

  // --- Data quality --------------------------------------------------------
  push({
    key: 'quality',
    label: 'Data quality',
    value: quality.score / 100,
    score: quality.score,
    detail: quality.summary,
  })

  // --- How much of the open half rests on likely deals ---------------------
  const highConfidence = contributions.filter(
    (entry) => entry.probability >= C.highConfidenceProbability,
  )
  const highShare =
    openForecast > 0
      ? highConfidence.reduce((total, entry) => total + entry.contribution, 0) / openForecast
      : null
  push({
    key: 'highConfidenceShare',
    label: 'Backed by likely deals',
    value: highShare,
    score: interpolate(
      [
        [0, 15],
        [0.3, 45],
        [0.55, 72],
        [0.8, 92],
        [1, 100],
      ],
      highShare,
    ),
    detail:
      highShare === null
        ? 'Nothing in the open pipeline is being counted.'
        : `${Math.round(highShare * 100)}% of the projected pipeline revenue sits in deals at ${Math.round(C.highConfidenceProbability * 100)}% or above.`,
  })

  // --- Health of what has to close -----------------------------------------
  const healthyShare =
    openForecast > 0
      ? contributions
          .filter((entry) => entry.health.band === 'healthy')
          .reduce((total, entry) => total + entry.contribution, 0) / openForecast
      : null
  push({
    key: 'health',
    label: 'Health of the deals counted',
    value: healthyShare,
    score: interpolate(
      [
        [0, 10],
        [0.35, 42],
        [0.6, 70],
        [0.85, 94],
        [1, 100],
      ],
      healthyShare,
    ),
    detail:
      healthyShare === null
        ? 'No open deals contribute to the forecast.'
        : `${Math.round(healthyShare * 100)}% of the projected pipeline revenue comes from deals in the healthy band.`,
  })

  // --- Concentration: is the period resting on a handful of deals ----------
  const top = [...contributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, C.concentrationDeals)
  const concentration =
    openForecast > 0
      ? top.reduce((total, entry) => total + entry.contribution, 0) / openForecast
      : null
  push({
    key: 'concentration',
    label: 'Spread across deals',
    value: concentration,
    // Inverted: high concentration is low confidence.
    score: interpolate(
      [
        [0.15, 100],
        [0.35, 74],
        [0.55, 45],
        [0.75, 22],
        [1, 8],
      ],
      concentration,
    ),
    detail:
      concentration === null
        ? 'No open deals to spread across.'
        : `The largest ${top.length} ${top.length === 1 ? 'deal carries' : 'deals carry'} ${Math.round(concentration * 100)}% of the projected pipeline revenue.`,
  })

  // --- Coverage ------------------------------------------------------------
  push({
    key: 'coverage',
    label: 'Pipeline coverage',
    value: coverage,
    score: interpolate(
      [
        [0.5, 10],
        [1, 34],
        [2, 62],
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

  // Renormalise so the reported weight is the share actually applied.
  const rawTotal = factors.reduce((total, factor) => total + factor.weight, 0)
  for (const factor of factors) factor.weight = factor.weight / rawTotal

  const score = Math.round(
    clamp100(factors.reduce((total, factor) => total + factor.score * factor.weight, 0)),
  )

  const level = score >= C.confidence.high ? 'high' : score >= C.confidence.moderate ? 'moderate' : 'low'
  const label = level === 'high' ? 'High Confidence' : level === 'moderate' ? 'Moderate Confidence' : 'Low Confidence'

  const weakest = [...factors].sort((a, b) => a.score - b.score)[0]
  const strongest = [...factors].sort((a, b) => b.score - a.score)[0]

  return {
    score,
    level,
    label,
    factors,
    summary:
      level === 'high'
        ? `${strongest.detail} Nothing in the make-up of the forecast undermines it.`
        : `Confidence is held back because ${lower(weakest.detail)} ${strongest.detail}`,
  }
}

/** Lowercases the first letter so a sentence can be quoted mid-clause. */
const lower = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1)
